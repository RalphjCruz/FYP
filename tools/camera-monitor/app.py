import base64
import re
from datetime import datetime, timezone
from math import sqrt
from typing import Literal

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DATA_URL_PATTERN = re.compile(r"^data:image/[a-zA-Z0-9.+-]+;base64,(?P<data>[A-Za-z0-9+/=]+)$")


class AnalyzeRequest(BaseModel):
    imageDataUrl: str


class AnalyzeResult(BaseModel):
    state: Literal["focused", "away", "looking_down", "using_phone"]
    confidence: float
    reason: str
    analyzedAt: str
    debug: dict


app = FastAPI(title="MySlime Camera Monitor")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

face_mesh = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=False,
    min_detection_confidence=0.55,
)
hands = mp.solutions.hands.Hands(
    static_image_mode=True,
    max_num_hands=2,
    model_complexity=0,
    min_detection_confidence=0.58,
)


def _distance(a_x: float, a_y: float, b_x: float, b_y: float) -> float:
    return sqrt((a_x - b_x) ** 2 + (a_y - b_y) ** 2)


def _decode_data_url(image_data_url: str) -> np.ndarray | None:
    match = DATA_URL_PATTERN.match(image_data_url.strip())
    if not match:
        return None

    raw_bytes = base64.b64decode(match.group("data"))
    np_buffer = np.frombuffer(raw_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
    return image


def _is_reliable_point(x: float, y: float) -> bool:
    margin = 0.02
    return margin <= x <= (1.0 - margin) and margin <= y <= (1.0 - margin)


def _analyze_frame(image: np.ndarray) -> AnalyzeResult:
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    face_result = face_mesh.process(rgb_image)
    hand_result = hands.process(rgb_image)

    analyzed_at = datetime.now(timezone.utc).isoformat()
    debug = {
        "facePoints": [],
        "metrics": {
            "hasFace": False,
            "allKeyPointsVisible": False,
            "missingPointCount": 0.0,
            "headTurnedTooFar": False,
            "headYawAbs": 0.0,
            "earBalanceDiff": 0.0,
            "lookingDown": False,
            "usingPhone": False,
            "noseEyeDelta": 0.0,
            "chinNoseDelta": 0.0,
            "earDistance": 0.0,
            "centerOffset": 0.0,
            "handDetected": False,
            "visibleHandPointCount": 0.0,
            "visibleFingerTipCount": 0.0,
            "handNearChinCount": 0.0,
            "handBelowEyesCount": 0.0,
            "closestFingerDistance": 1.0,
            "fingerProximityThreshold": 0.0,
            "closeFingerPairCount": 0.0,
            "phoneSignalScore": 0.0,
        },
        "decisionPath": [],
    }

    if not face_result.multi_face_landmarks:
        debug["decisionPath"] = [
            "No face landmarks detected.",
            "Classified as away.",
        ]
        return AnalyzeResult(
            state="away",
            confidence=0.94,
            reason="No face detected in frame.",
            analyzedAt=analyzed_at,
            debug=debug,
        )

    landmarks = face_result.multi_face_landmarks[0].landmark
    nose = landmarks[1]
    left_eye = landmarks[33]
    right_eye = landmarks[263]
    left_ear = landmarks[234]
    right_ear = landmarks[454]
    chin = landmarks[152]

    debug["metrics"]["hasFace"] = True
    raw_face_points = [
        {"label": "nose", "x": float(nose.x), "y": float(nose.y)},
        {"label": "left_eye", "x": float(left_eye.x), "y": float(left_eye.y)},
        {"label": "right_eye", "x": float(right_eye.x), "y": float(right_eye.y)},
        {"label": "left_ear", "x": float(left_ear.x), "y": float(left_ear.y)},
        {"label": "right_ear", "x": float(right_ear.x), "y": float(right_ear.y)},
        {"label": "chin", "x": float(chin.x), "y": float(chin.y)},
    ]

    visible_face_points = [point for point in raw_face_points if _is_reliable_point(point["x"], point["y"])]

    eye_center_x = (left_eye.x + right_eye.x) / 2.0
    eye_center_y = (left_eye.y + right_eye.y) / 2.0
    nose_eye_delta = nose.y - eye_center_y
    chin_nose_delta = chin.y - nose.y
    ear_distance = _distance(left_ear.x, left_ear.y, right_ear.x, right_ear.y)
    left_ear_to_nose = abs(nose.x - left_ear.x)
    right_ear_to_nose = abs(right_ear.x - nose.x)
    ear_balance_diff = abs(left_ear_to_nose - right_ear_to_nose)
    head_yaw_abs = abs(nose.x - eye_center_x)
    debug["metrics"]["noseEyeDelta"] = float(nose_eye_delta)
    debug["metrics"]["chinNoseDelta"] = float(chin_nose_delta)
    debug["metrics"]["earDistance"] = float(ear_distance)
    debug["metrics"]["headYawAbs"] = float(head_yaw_abs)
    debug["metrics"]["earBalanceDiff"] = float(ear_balance_diff)

    raw_hand_points = []
    raw_finger_tip_points = []
    if hand_result.multi_hand_landmarks:
        hand_base_label_names = {0: "wrist", 1: "thumb_cmc", 5: "index_mcp", 17: "pinky_mcp"}
        hand_tip_label_names = {4: "thumb_tip", 8: "index_tip", 12: "middle_tip", 16: "ring_tip", 20: "pinky_tip"}
        for hand_index, hand_landmarks in enumerate(hand_result.multi_hand_landmarks):
            for landmark_index, landmark_name in hand_base_label_names.items():
                point = hand_landmarks.landmark[landmark_index]
                raw_hand_points.append(
                    {
                        "label": f"hand{hand_index + 1}_{landmark_name}",
                        "x": float(point.x),
                        "y": float(point.y),
                    }
                )
            for landmark_index, landmark_name in hand_tip_label_names.items():
                point = hand_landmarks.landmark[landmark_index]
                raw_finger_tip_points.append(
                    {
                        "label": f"hand{hand_index + 1}_{landmark_name}",
                        "x": float(point.x),
                        "y": float(point.y),
                    }
                )

    visible_hand_points = [point for point in raw_hand_points if _is_reliable_point(point["x"], point["y"])]
    visible_finger_tip_points = [point for point in raw_finger_tip_points if _is_reliable_point(point["x"], point["y"])]
    debug["metrics"]["handDetected"] = len(raw_hand_points) > 0
    debug["metrics"]["visibleHandPointCount"] = float(len(visible_hand_points))
    debug["metrics"]["visibleFingerTipCount"] = float(len(visible_finger_tip_points))

    head_turned_too_far = head_yaw_abs > 0.03 or ear_balance_diff > 0.11
    debug["metrics"]["headTurnedTooFar"] = bool(head_turned_too_far)

    if head_turned_too_far:
        # If turn is strong, at least one ear tends to be unreliable; hide only likely-occluded ear.
        if left_ear_to_nose < right_ear_to_nose * 0.62:
            visible_face_points = [point for point in visible_face_points if point["label"] != "left_ear"]
        elif right_ear_to_nose < left_ear_to_nose * 0.62:
            visible_face_points = [point for point in visible_face_points if point["label"] != "right_ear"]

    visible_labels = {point["label"] for point in visible_face_points}
    missing_points = [point["label"] for point in raw_face_points if point["label"] not in visible_labels]
    debug["facePoints"] = [*visible_face_points, *visible_hand_points, *visible_finger_tip_points]
    debug["metrics"]["allKeyPointsVisible"] = len(missing_points) == 0
    debug["metrics"]["missingPointCount"] = float(len(missing_points))

    if missing_points:
        debug["decisionPath"] = [
            "Face detected but some key points are unreliable/out-of-frame.",
            f"Missing points: {', '.join(missing_points)}.",
            "Classified as away (not focused).",
        ]
        return AnalyzeResult(
            state="away",
            confidence=0.92,
            reason="Key face landmarks are not fully reliable.",
            analyzedAt=analyzed_at,
            debug=debug,
        )

    if head_turned_too_far:
        debug["decisionPath"] = [
            "Face detected but head yaw indicates strong side turn.",
            "At least one side landmarks are considered unreliable.",
            "Classified as away (not focused).",
        ]
        return AnalyzeResult(
            state="away",
            confidence=0.91,
            reason="Head is turned too far; key points considered not found.",
            analyzedAt=analyzed_at,
            debug=debug,
        )

    looking_down = nose_eye_delta > 0.112 or chin_nose_delta > 0.255
    debug["metrics"]["lookingDown"] = bool(looking_down)

    near_chin_threshold = max(0.085, min(0.22, ear_distance * 0.95))
    hand_near_chin_count = 0
    hand_below_eyes_count = 0
    for point in visible_hand_points:
        if point["y"] > eye_center_y:
            hand_below_eyes_count += 1

        if _distance(point["x"], point["y"], chin.x, chin.y) <= near_chin_threshold:
            hand_near_chin_count += 1

    debug["metrics"]["handNearChinCount"] = float(hand_near_chin_count)
    debug["metrics"]["handBelowEyesCount"] = float(hand_below_eyes_count)

    finger_proximity_threshold = max(0.024, min(0.085, ear_distance * 0.28))
    close_finger_pair_count = 0
    closest_finger_distance = 1.0
    for first_index in range(len(visible_finger_tip_points)):
        for second_index in range(first_index + 1, len(visible_finger_tip_points)):
            first_point = visible_finger_tip_points[first_index]
            second_point = visible_finger_tip_points[second_index]
            finger_distance = _distance(first_point["x"], first_point["y"], second_point["x"], second_point["y"])
            closest_finger_distance = min(closest_finger_distance, finger_distance)
            if finger_distance <= finger_proximity_threshold:
                close_finger_pair_count += 1

    debug["metrics"]["closestFingerDistance"] = float(closest_finger_distance)
    debug["metrics"]["fingerProximityThreshold"] = float(finger_proximity_threshold)
    debug["metrics"]["closeFingerPairCount"] = float(close_finger_pair_count)

    phone_signal_score = 0.0
    if looking_down:
        phone_signal_score += 0.44
    if close_finger_pair_count >= 1:
        phone_signal_score += 0.34
    if len(visible_hand_points) >= 2:
        phone_signal_score += 0.2
    if hand_below_eyes_count >= 2:
        phone_signal_score += 0.14
    if hand_near_chin_count >= 2:
        phone_signal_score += 0.24

    using_phone_by_finger_proximity = len(visible_finger_tip_points) >= 2 and close_finger_pair_count >= 1
    using_phone_by_hand_cluster = (
        looking_down
        and len(visible_hand_points) >= 2
        and hand_below_eyes_count >= 2
        and hand_near_chin_count >= 2
    )
    using_phone = using_phone_by_finger_proximity or using_phone_by_hand_cluster
    debug["metrics"]["usingPhone"] = bool(using_phone)
    debug["metrics"]["phoneSignalScore"] = float(phone_signal_score)

    if using_phone:
        phone_confidence = min(0.95, max(0.62, 0.6 + phone_signal_score * 0.4))
        if using_phone_by_finger_proximity:
            debug["decisionPath"] = [
                "Face detected and key points are reliable.",
                "At least one fingertip pair is in close proximity.",
                "MVP rule: close fingertip pair is treated as probable phone usage.",
                "Classified as using_phone.",
            ]
        else:
            debug["decisionPath"] = [
                "Face detected and key points are reliable.",
                "Downward gaze is present.",
                "Hand base points cluster below eyes near chin.",
                "Classified as using_phone.",
            ]
        return AnalyzeResult(
            state="using_phone",
            confidence=phone_confidence,
            reason="Hand/finger posture suggests probable phone usage.",
            analyzedAt=analyzed_at,
            debug=debug,
        )

    if looking_down:
        down_score = max(0.0, nose_eye_delta - 0.112) + max(0.0, chin_nose_delta - 0.255)
        down_confidence = min(0.96, max(0.6, 0.6 + down_score * 5.8))
        debug["decisionPath"] = [
            "Face detected.",
            "Head pitch/landmark ratio indicates downward gaze.",
            "Classified as looking_down.",
        ]
        return AnalyzeResult(
            state="looking_down",
            confidence=down_confidence,
            reason="Head pitch suggests looking down/off-screen from the study area.",
            analyzedAt=analyzed_at,
            debug=debug,
        )

    center_offset = abs(nose.x - eye_center_x)
    debug["metrics"]["centerOffset"] = float(center_offset)
    focus_confidence = max(0.58, min(0.95, 0.88 - center_offset))
    debug["decisionPath"] = [
        "Face detected.",
        "All required key points are visible.",
        "Head pose indicates on-screen attention.",
        "Classified as focused.",
    ]
    return AnalyzeResult(
        state="focused",
        confidence=focus_confidence,
        reason="Face posture appears directed toward screen/work area.",
        analyzedAt=analyzed_at,
        debug=debug,
    )


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "camera-monitor"}


@app.post("/analyze")
def analyze_frame(request: AnalyzeRequest):
    image = _decode_data_url(request.imageDataUrl)
    if image is None:
        return {"success": False, "message": "Invalid image payload"}

    result = _analyze_frame(image)
    return {"success": True, "data": result.model_dump()}

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
    state: Literal["focused", "away", "looking_down"]
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
            "noseEyeDelta": 0.0,
            "chinNoseDelta": 0.0,
            "earDistance": 0.0,
            "centerOffset": 0.0,
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
    debug["facePoints"] = visible_face_points
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

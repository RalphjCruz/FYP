import type { StudySurveyInput } from '../types';

type StudySurveyFormProps = {
  draftSurvey: StudySurveyInput;
  onUpdateDraft: (update: Partial<StudySurveyInput>) => void;
};

export const StudySurveyForm = ({ draftSurvey, onUpdateDraft }: StudySurveyFormProps) => {
  return (
    <section className="focus-survey" aria-label="Study personalization survey">
      <div className="focus-survey-header">
        <h4>Study Personalization</h4>
        <p>Set your study profile to tailor focus session length. Changes apply immediately.</p>
      </div>

      <div className="focus-survey-grid">
        <label className="focus-field">
          <span>Study style</span>
          <select
            value={draftSurvey.studyStyle}
            onChange={(event) =>
              onUpdateDraft({
                studyStyle: event.target.value as StudySurveyInput['studyStyle'],
              })
            }
          >
            <option value="deep_focus">Deep focus</option>
            <option value="balanced">Balanced</option>
            <option value="sprint">Sprint</option>
          </select>
        </label>

        <label className="focus-field">
          <span>Distraction level</span>
          <select
            value={draftSurvey.distractionLevel}
            onChange={(event) =>
              onUpdateDraft({
                distractionLevel: event.target.value as StudySurveyInput['distractionLevel'],
              })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="focus-field">
          <span>Free minutes per day: {draftSurvey.availableMinutesPerDay} min</span>
          <input
            type="range"
            min={30}
            max={720}
            step={15}
            value={draftSurvey.availableMinutesPerDay}
            onChange={(event) => {
              const numericValue = Number(event.target.value);
              onUpdateDraft({
                availableMinutesPerDay: Number.isNaN(numericValue)
                  ? draftSurvey.availableMinutesPerDay
                  : Math.min(720, Math.max(30, Math.round(numericValue))),
              });
            }}
          />
        </label>

        <label className="focus-field">
          <span>Session intensity: {draftSurvey.preferredSessionIntensity}</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={draftSurvey.preferredSessionIntensity}
            onChange={(event) =>
              onUpdateDraft({
                preferredSessionIntensity: Number(event.target.value) as StudySurveyInput['preferredSessionIntensity'],
              })
            }
          />
        </label>
      </div>
    </section>
  );
};

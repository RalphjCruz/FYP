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
        <p>Set your focus session minutes. Changes apply immediately.</p>
      </div>

      <div className="focus-survey-grid focus-survey-grid-single">
        <label className="focus-field">
          <span>Session minutes: {draftSurvey.availableMinutesPerDay} min</span>
          <input
            type="range"
            min={5}
            max={180}
            step={5}
            value={draftSurvey.availableMinutesPerDay}
            onChange={(event) => {
              const numericValue = Number(event.target.value);
              onUpdateDraft({
                availableMinutesPerDay: Number.isNaN(numericValue)
                  ? draftSurvey.availableMinutesPerDay
                  : Math.min(180, Math.max(5, Math.round(numericValue))),
              });
            }}
          />
        </label>
      </div>
    </section>
  );
};

import type { StudySurveyInput } from '../types';

type StudySurveyFormProps = {
  draftSurvey: StudySurveyInput;
  onUpdateDraft: (update: Partial<StudySurveyInput>) => void;
};

export const StudySurveyForm = ({ draftSurvey, onUpdateDraft }: StudySurveyFormProps) => {
  const inputClass = 'w-full rounded-lg border-2 border-gb-border bg-gb-bg px-3 py-3 font-sans text-base text-gb-text outline-none transition focus:ring-2 focus:ring-gb-border sm:text-lg';

  return (
    <section className="focus-survey rounded-xl border-2 border-gb-border bg-gb-panel/80 p-4" aria-label="Study personalization survey">
      <div className="focus-survey-header">
        <h4 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Study Personalization</h4>
        <p className="mt-2 font-sans text-base text-gb-text sm:text-lg">Set your study profile to tailor focus session length. Changes apply immediately.</p>
      </div>

      <div className="focus-survey-grid mt-3 grid gap-3 md:grid-cols-2">
        <label className="focus-field space-y-2">
          <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">Study style</span>
          <select
            value={draftSurvey.studyStyle}
            onChange={(event) =>
              onUpdateDraft({
                studyStyle: event.target.value as StudySurveyInput['studyStyle'],
              })
            }
            className={inputClass}
          >
            <option value="deep_focus">Deep focus</option>
            <option value="balanced">Balanced</option>
            <option value="sprint">Sprint</option>
          </select>
        </label>

        <label className="focus-field space-y-2">
          <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">Distraction level</span>
          <select
            value={draftSurvey.distractionLevel}
            onChange={(event) =>
              onUpdateDraft({
                distractionLevel: event.target.value as StudySurveyInput['distractionLevel'],
              })
            }
            className={inputClass}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="focus-field space-y-2">
          <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">Free minutes per day</span>
          <input
            type="number"
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
            className={inputClass}
          />
        </label>

        <label className="focus-field space-y-2">
          <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">
            Session intensity: {draftSurvey.preferredSessionIntensity}
          </span>
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
            className="w-full accent-gb-progress"
          />
        </label>
      </div>
    </section>
  );
};

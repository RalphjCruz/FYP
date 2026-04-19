import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudySurveyForm } from './StudySurveyForm';

describe('StudySurveyForm', () => {
  it('renders a single session-minutes slider with 5-180 range', () => {
    const onUpdateDraft = vi.fn();

    render(
      <StudySurveyForm
        draftSurvey={{
          studyStyle: 'balanced',
          distractionLevel: 'medium',
          preferredSessionIntensity: 3,
          availableMinutesPerDay: 30,
        }}
        onUpdateDraft={onUpdateDraft}
      />,
    );

    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(1);
    expect(sliders[0]).toHaveAttribute('min', '5');
    expect(sliders[0]).toHaveAttribute('max', '180');
    expect(sliders[0]).toHaveAttribute('step', '5');
  });

  it('emits availableMinutesPerDay updates when slider changes', () => {
    const onUpdateDraft = vi.fn();

    render(
      <StudySurveyForm
        draftSurvey={{
          studyStyle: 'balanced',
          distractionLevel: 'medium',
          preferredSessionIntensity: 3,
          availableMinutesPerDay: 30,
        }}
        onUpdateDraft={onUpdateDraft}
      />,
    );

    const slider = screen.getByRole('slider', { name: /session minutes/i });
    fireEvent.change(slider, { target: { value: '95' } });

    expect(onUpdateDraft).toHaveBeenCalledWith({
      availableMinutesPerDay: 95,
    });
  });
});

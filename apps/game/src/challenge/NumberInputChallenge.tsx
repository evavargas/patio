import type { NumberInputConfigV1 } from '@patio/contracts';
import { useState } from 'react';
import { t } from '../i18n/texts';
import type { MechanicProps } from './mechanic-props';
import { areNumbersFilled, isNumberInputSolved, splitTemplate } from './rules';

export function NumberInputChallenge({ config, isDone, onFeedback, onAchieved }: MechanicProps<NumberInputConfigV1>) {
  const [values, setValues] = useState<Record<string, string>>({});
  const parts = splitTemplate(config.expression);
  const inputMode = config.fields.every((f) => Number.isInteger(f.expected)) ? 'numeric' : 'decimal';

  const submit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isDone) return;
    if (!areNumbersFilled(values, config.fields)) return onFeedback('fillAll');
    if (isNumberInputSolved(values, config.fields)) {
      onFeedback(null);
      onAchieved();
    } else onFeedback('tryOtherStrategy');
  };

  let blankNumber = 0;
  return (
    <form onSubmit={submit}>
      <p className="expression">
        {parts.map((part, i) => {
          if (part.kind === 'text') return <span key={i}>{part.value}</span>;
          const id = part.id;
          blankNumber++;
          return (
            <input
              key={i}
              type="text"
              inputMode={inputMode}
              autoComplete="off"
              aria-label={t('blankLabel', { n: blankNumber })}
              disabled={isDone}
              value={values[id] ?? ''}
              onChange={(e) => setValues({ ...values, [id]: e.target.value })}
            />
          );
        })}
      </p>
      <button type="submit" disabled={isDone}>
        {t('check')}
      </button>
    </form>
  );
}

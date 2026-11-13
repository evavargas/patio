import type { TextKey } from '../i18n/texts';
import { ApiError } from './api';

/** Mensaje amable para cada error. Nunca dice que palabra del apodo fallo ni muestra codigos tecnicos. */
export function errorText(error: unknown): TextKey {
  if (!(error instanceof ApiError)) return 'errGeneric';
  switch (error.code) {
    case 'NICKNAME_NOT_ALLOWED':
      return 'errNickname';
    case 'GROUP_NOT_FOUND':
      return 'errGroupNotFound';
    case 'GROUP_INACTIVE':
      return 'errGroupInactive';
    case 'GROUP_FULL':
      return 'errGroupFull';
    case 'RECOVERY_CODE_INVALID':
      return 'errRecovery';
    case 'RATE_LIMITED':
      return 'errBusy';
    default:
      return error.status === 0 ? 'errNetwork' : error.status === 429 ? 'errBusy' : 'errGeneric';
  }
}

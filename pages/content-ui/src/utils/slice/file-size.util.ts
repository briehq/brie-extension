import { MAX_FILE_SIZE } from '@src/constants';

/**
 * Validates that no file exceeds the backend size limit
 * @param files - array of File objects
 * @param limit - max allowed size in bytes
 */
export const validateMaxFileSize = (file: File, limit: number = MAX_FILE_SIZE): boolean => file.size > limit;

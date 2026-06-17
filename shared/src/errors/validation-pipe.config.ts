import { ValidationPipe, ValidationError, BadRequestException } from '@nestjs/common';

/**
 * Creates a pre-configured ValidationPipe with descriptive field-level error messages.
 * Transforms validation errors into a standardized format compatible with GlobalExceptionFilter.
 */
export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const messages = flattenValidationErrors(errors);
      return new BadRequestException(messages);
    },
  });
}

function flattenValidationErrors(errors: ValidationError[], parentField = ''): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const fieldName = parentField ? `${parentField}.${error.property}` : error.property;

    if (error.constraints) {
      const constraintMessages = Object.values(error.constraints);
      messages.push(...constraintMessages.map((msg) => `${fieldName} ${msg}`));
    }

    if (error.children && error.children.length > 0) {
      messages.push(...flattenValidationErrors(error.children, fieldName));
    }
  }

  return messages;
}

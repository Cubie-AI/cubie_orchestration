interface IError {
  message: string;
  timestamp: number;
}

const logger = {
  info: console.log,
  error: console.error,
};
class ErrorStorage {
  errors: IError[] = [];

  cleanOldErrors() {
    logger.info("Cleaning old errors");
    this.errors = this.errors.filter((error) => {
      return error.timestamp > Date.now() - 1000 * 60 * 60 * 24;
    });
  }

  clearErrors() {
    logger.info("Clearing all errors");
    this.errors = [];
  }

  deleteError(index: number) {
    logger.info(`Deleting error at index ${index}`);
    this.errors.splice(index, 1);
  }

  addError(message: string) {
    logger.error(message);
    const error: IError = {
      message,
      timestamp: Date.now(),
    };
    this.errors.push(error);
  }
}

export const errorInstance = new ErrorStorage();

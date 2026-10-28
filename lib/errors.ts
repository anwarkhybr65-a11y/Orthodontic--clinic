export class ClinicError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ClinicError";
    this.status = status;
  }
}

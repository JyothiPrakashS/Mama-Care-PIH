export function generateTempPassword() {
    const random = Math.random().toString(36).slice(-6);
    return `Temp@${random}`;
  }
export function generateInviteCode(name: string) {
    const prefix = name.substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  }
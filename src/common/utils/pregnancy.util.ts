export function calculatePregnancyWeek(startDate: Date): number {
    const now = new Date();
  
    const diffInMs = now.getTime() - startDate.getTime();
  
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
    return Math.floor(diffInDays / 7) + 1;
  }

  export function calculateTrimester(week: number): string {
    if (week <= 13) return 'FIRST';
    if (week <= 27) return 'SECOND';
    return 'THIRD';
  }

  export function calculateDueDate(startDate: Date): Date {
    const dueDate = new Date(startDate);
  
    dueDate.setDate(dueDate.getDate() + 280);
  
    return dueDate;
  }
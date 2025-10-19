export const formatCurrency = (amount: number): string => {
  // Using a custom format to display "Rs" instead of "PKR" for brevity
  const formattedAmount = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs ${formattedAmount}`;
};

export const formatDisplayTime = (time24: string): string => {
    if (!time24 || !time24.includes(':')) return time24;
    const [hour, minute] = time24.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) return time24;
    
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const minuteStr = String(minute).padStart(2, '0');
    
    return `${hour12}:${minuteStr} ${ampm}`;
};

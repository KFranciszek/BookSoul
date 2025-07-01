let counter = 0;

export const generateUniqueId = (): string => {
  counter += 1;
  return `film_${Date.now()}_${counter}_${Math.random().toString(36).substr(2, 9)}`;
};
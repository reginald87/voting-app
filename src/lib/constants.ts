export const DEPARTMENTS = [
  "Medicine and Surgery (MBBS)",
  "Nursing Science",
  "Medical Laboratory Science",
  "Pharmacy",
  "Public Health",
  "Physiotherapy",
  "Radiography",
  "Anatomy",
  "Physiology",
  "Biochemistry",
  "Community Health",
  "Environmental Health Science",
];

export const LEVELS = [
  "100 Level",
  "200 Level",
  "300 Level",
  "400 Level",
  "500 Level",
  "600 Level",
];

export function formatName(first: string, last: string) {
  return `${first} ${last}`.trim();
}

// Matriculation number must look like UG/23/0045 (UG / two digits / four digits).
export const MAT_NUMBER_PATTERN = /^UG\/\d{2}\/\d{4}$/;
export const MAT_NUMBER_HINT = "e.g. UG/23/0045";

export function isValidMatNumber(value: string) {
  return MAT_NUMBER_PATTERN.test(value.trim());
}

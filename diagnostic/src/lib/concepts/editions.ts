/**
 * NCERT textbook editions. A Class 10 student in 2026 studied Class 7 from a different
 * book than a Class 8 student did, so every lineage cites the edition the student
 * actually used for that class.
 */
export type Edition = "pre2023" | "r2023" | "gp";

export const EDITION_LABEL: Record<Edition, string> = {
  pre2023: "NCERT (2006–2022 edition)",
  r2023: "NCERT (rationalised, 2023–)",
  gp: "NCERT Ganita Prakash (new)",
};

/** Ganita Prakash starts: Class 6 in 2024-25, Classes 7 and 8 in 2025-26. Admin can override. */
export const GP_START_YEAR: Partial<Record<number, number>> = { 6: 2024, 7: 2025, 8: 2025 };

/**
 * Which edition a student used for `cls`, given the academic year (start year) they were in
 * their current class.
 */
export function editionFor(cls: number, currentClass: number, currentYear: number,
                           gpStart: Partial<Record<number, number>> = GP_START_YEAR): Edition {
  const yearInThatClass = currentYear - (currentClass - cls);
  const gp = gpStart[cls];
  if (gp !== undefined && yearInThatClass >= gp) return "gp";
  return yearInThatClass >= 2023 ? "r2023" : "pre2023";
}

/** Chapter lists by class and edition. `null` = chapter not in that edition. */
export type ChapterRow = { key: string; name: string; pre2023: number | null; r2023: number | null };

/** Keys are stable; names follow the 2006–2022 / rationalised books. */
export const MATHS_CHAPTERS: Record<number, ChapterRow[]> = {
  5: [
    { key: "5.fish", name: "The Fish Tale", pre2023: 1, r2023: 1 },
    { key: "5.angles", name: "Shapes and Angles", pre2023: 2, r2023: 2 },
    { key: "5.squares", name: "How Many Squares?", pre2023: 3, r2023: 3 },
    { key: "5.parts", name: "Parts and Wholes", pre2023: 4, r2023: 4 },
    { key: "5.multiples", name: "Be My Multiple, I'll Be Your Factor", pre2023: 6, r2023: 6 },
    { key: "5.patterns", name: "Can You See the Pattern?", pre2023: 7, r2023: 7 },
    { key: "5.tenths", name: "Tenths and Hundredths", pre2023: 10, r2023: 10 },
    { key: "5.area", name: "Area and its Boundary", pre2023: 11, r2023: 11 },
    { key: "5.muldiv", name: "Ways to Multiply and Divide", pre2023: 13, r2023: 13 },
  ],
  6: [
    { key: "6.numbers", name: "Knowing Our Numbers", pre2023: 1, r2023: 1 },
    { key: "6.whole", name: "Whole Numbers", pre2023: 2, r2023: 2 },
    { key: "6.playing", name: "Playing with Numbers", pre2023: 3, r2023: 3 },
    { key: "6.geom", name: "Basic Geometrical Ideas", pre2023: 4, r2023: 4 },
    { key: "6.shapes", name: "Understanding Elementary Shapes", pre2023: 5, r2023: 5 },
    { key: "6.integers", name: "Integers", pre2023: 6, r2023: 6 },
    { key: "6.fractions", name: "Fractions", pre2023: 7, r2023: 7 },
    { key: "6.decimals", name: "Decimals", pre2023: 8, r2023: 8 },
    { key: "6.data", name: "Data Handling", pre2023: 9, r2023: 9 },
    { key: "6.mensuration", name: "Mensuration", pre2023: 10, r2023: 10 },
    { key: "6.algebra", name: "Algebra", pre2023: 11, r2023: 11 },
    { key: "6.ratio", name: "Ratio and Proportion", pre2023: 12, r2023: 12 },
  ],
  7: [
    { key: "7.integers", name: "Integers", pre2023: 1, r2023: 1 },
    { key: "7.fracdec", name: "Fractions and Decimals", pre2023: 2, r2023: 2 },
    { key: "7.data", name: "Data Handling", pre2023: 3, r2023: 3 },
    { key: "7.equations", name: "Simple Equations", pre2023: 4, r2023: 4 },
    { key: "7.lines", name: "Lines and Angles", pre2023: 5, r2023: 5 },
    { key: "7.triangle", name: "The Triangle and its Properties", pre2023: 6, r2023: 6 },
    { key: "7.congruence", name: "Congruence of Triangles", pre2023: 7, r2023: null },
    { key: "7.comparing", name: "Comparing Quantities", pre2023: 8, r2023: 7 },
    { key: "7.rational", name: "Rational Numbers", pre2023: 9, r2023: 8 },
    { key: "7.perimeter", name: "Perimeter and Area", pre2023: 11, r2023: 9 },
    { key: "7.algexp", name: "Algebraic Expressions", pre2023: 12, r2023: 10 },
    { key: "7.exponents", name: "Exponents and Powers", pre2023: 13, r2023: 11 },
  ],
  8: [
    { key: "8.rational", name: "Rational Numbers", pre2023: 1, r2023: 1 },
    { key: "8.lineq", name: "Linear Equations in One Variable", pre2023: 2, r2023: 2 },
    { key: "8.quads", name: "Understanding Quadrilaterals", pre2023: 3, r2023: 3 },
    { key: "8.data", name: "Data Handling", pre2023: 5, r2023: 4 },
    { key: "8.squares", name: "Squares and Square Roots", pre2023: 6, r2023: 5 },
    { key: "8.cubes", name: "Cubes and Cube Roots", pre2023: 7, r2023: 6 },
    { key: "8.comparing", name: "Comparing Quantities", pre2023: 8, r2023: 7 },
    { key: "8.identities", name: "Algebraic Expressions and Identities", pre2023: 9, r2023: 8 },
    { key: "8.mensuration", name: "Mensuration", pre2023: 11, r2023: 9 },
    { key: "8.exponents", name: "Exponents and Powers", pre2023: 12, r2023: 10 },
    { key: "8.proportion", name: "Direct and Inverse Proportions", pre2023: 13, r2023: 11 },
    { key: "8.factorisation", name: "Factorisation", pre2023: 14, r2023: 12 },
    { key: "8.graphs", name: "Introduction to Graphs", pre2023: 15, r2023: 13 },
  ],
  9: [
    { key: "9.numsys", name: "Number Systems", pre2023: 1, r2023: 1 },
    { key: "9.poly", name: "Polynomials", pre2023: 2, r2023: 2 },
    { key: "9.coord", name: "Coordinate Geometry", pre2023: 3, r2023: 3 },
    { key: "9.lin2", name: "Linear Equations in Two Variables", pre2023: 4, r2023: 4 },
    { key: "9.euclid", name: "Introduction to Euclid's Geometry", pre2023: 5, r2023: 5 },
    { key: "9.lines", name: "Lines and Angles", pre2023: 6, r2023: 6 },
    { key: "9.triangles", name: "Triangles", pre2023: 7, r2023: 7 },
    { key: "9.quads", name: "Quadrilaterals", pre2023: 8, r2023: 8 },
    { key: "9.circles", name: "Circles", pre2023: 10, r2023: 9 },
    { key: "9.heron", name: "Heron's Formula", pre2023: 12, r2023: 10 },
    { key: "9.surface", name: "Surface Areas and Volumes", pre2023: 13, r2023: 11 },
    { key: "9.stats", name: "Statistics", pre2023: 14, r2023: 12 },
    { key: "9.prob", name: "Probability", pre2023: 15, r2023: null },
  ],
  10: [
    { key: "10.real", name: "Real Numbers", pre2023: 1, r2023: 1 },
    { key: "10.poly", name: "Polynomials", pre2023: 2, r2023: 2 },
    { key: "10.pair", name: "Pair of Linear Equations in Two Variables", pre2023: 3, r2023: 3 },
    { key: "10.quad", name: "Quadratic Equations", pre2023: 4, r2023: 4 },
    { key: "10.ap", name: "Arithmetic Progressions", pre2023: 5, r2023: 5 },
    { key: "10.triangles", name: "Triangles", pre2023: 6, r2023: 6 },
    { key: "10.coord", name: "Coordinate Geometry", pre2023: 7, r2023: 7 },
    { key: "10.trig", name: "Introduction to Trigonometry", pre2023: 8, r2023: 8 },
    { key: "10.trigapp", name: "Some Applications of Trigonometry", pre2023: 9, r2023: 9 },
    { key: "10.circles", name: "Circles", pre2023: 10, r2023: 10 },
    { key: "10.areas", name: "Areas Related to Circles", pre2023: 12, r2023: 11 },
    { key: "10.surface", name: "Surface Areas and Volumes", pre2023: 13, r2023: 12 },
    { key: "10.stats", name: "Statistics", pre2023: 14, r2023: 13 },
    { key: "10.prob", name: "Probability", pre2023: 15, r2023: 14 },
  ],
};

/**
 * Ganita Prakash chapter titles, as far as confirmed. `verified: false` rows must be checked
 * by a teacher on the Libraries screen before they are relied on.
 */
export const GANITA_PRAKASH: Record<number, { no: string; name: string; verified: boolean }[]> = {
  6: [
    { no: "1", name: "Patterns in Mathematics", verified: false },
    { no: "2", name: "Lines and Angles", verified: false },
    { no: "3", name: "Number Play", verified: false },
    { no: "4", name: "Data Handling and Presentation", verified: false },
    { no: "5", name: "Prime Time", verified: false },
    { no: "6", name: "Perimeter and Area", verified: false },
    { no: "7", name: "Fractions", verified: false },
    { no: "8", name: "Playing with Constructions", verified: false },
    { no: "9", name: "Symmetry", verified: false },
    { no: "10", name: "The Other Side of Zero", verified: false },
  ],
  7: [
    { no: "1", name: "Large Numbers Around Us", verified: false },
    { no: "2", name: "Arithmetic Expressions", verified: false },
    { no: "3", name: "A Peek Beyond the Point", verified: false },
    { no: "4", name: "Expressions using Letter-Numbers", verified: false },
    { no: "5", name: "Parallel and Intersecting Lines", verified: false },
    { no: "6", name: "Number Play", verified: false },
    { no: "7", name: "A Tale of Three Intersecting Lines", verified: false },
    { no: "8", name: "Working with Fractions", verified: false },
  ],
  8: [
    { no: "1", name: "A Square and A Cube", verified: false },
    { no: "2", name: "Power Play", verified: false },
    { no: "3", name: "A Story of Numbers", verified: false },
    { no: "4", name: "Quadrilaterals", verified: false },
    { no: "5", name: "Number Play", verified: false },
    { no: "6", name: "We Distribute, Yet Things Multiply", verified: false },
    { no: "7", name: "Proportional Reasoning", verified: false },
  ],
};

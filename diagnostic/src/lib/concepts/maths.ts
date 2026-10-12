/**
 * Mathematics concept map, Classes 5–10 (NCERT / CBSE; UP Board uses the NCERT books for
 * Classes 9–10). Each concept names the chapter it is first taught in and the concepts it
 * builds on, so Claude can trace a weakness backwards class by class.
 *
 * Seeded from the NCERT books and the SEVEN reference pack. Teachers can correct it on the
 * Libraries screen; the database copy wins over this file once seeded.
 */
export type Concept = {
  id: string;
  cls: number;
  chapter: string; // key into MATHS_CHAPTERS
  name: string;
  prereq: string[];
};

const c = (id: string, cls: number, chapter: string, name: string, prereq: string[] = []): Concept =>
  ({ id, cls, chapter, name, prereq });

export const MATHS_CONCEPTS: Concept[] = [
  // ── Class 5 foundations
  c("M5.MULT", 5, "5.muldiv", "Multiplication as repeated addition; multiplying and dividing large numbers"),
  c("M5.FACTORS", 5, "5.multiples", "Factors and multiples; common multiples"),
  c("M5.FRACPART", 5, "5.parts", "Fractions as equal parts of a whole or a length"),
  c("M5.DECIMAL", 5, "5.tenths", "Tenths and hundredths; decimals of a length"),
  c("M5.AREA", 5, "5.area", "Area and perimeter by counting squares"),
  c("M5.ANGLES", 5, "5.angles", "Angles: right, acute, obtuse"),

  // ── Class 6
  c("M6.PLACEVAL", 6, "6.numbers", "Large numbers, place value, estimation"),
  c("M6.DISTRIB", 6, "6.whole", "Properties of whole numbers: commutative, associative, distributive law", ["M5.MULT"]),
  c("M6.HCFLCM", 6, "6.playing", "Primes, prime factorisation, HCF and LCM", ["M5.FACTORS"]),
  c("M6.DIVTESTS", 6, "6.playing", "Divisibility rules", ["M5.FACTORS"]),
  c("M6.GEOMBASIC", 6, "6.geom", "Points, lines, line segments, rays, polygons"),
  c("M6.ANGLEMEAS", 6, "6.shapes", "Measuring angles; types of triangles and quadrilaterals", ["M5.ANGLES"]),
  c("M6.NUMLINE", 6, "6.integers", "Integers on the number line; ordering"),
  c("M6.INTADD", 6, "6.integers", "Adding and subtracting integers", ["M6.NUMLINE"]),
  c("M6.FRACTIONS", 6, "6.fractions", "Fractions: equivalent fractions, on the number line, adding and subtracting", ["M5.FRACPART"]),
  c("M6.DECIMALS", 6, "6.decimals", "Decimals: place value, comparison, addition and subtraction", ["M5.DECIMAL"]),
  c("M6.DATA", 6, "6.data", "Collecting and representing data: pictographs, bar graphs"),
  c("M6.PERIMAREA", 6, "6.mensuration", "Perimeter and area of rectangles and squares", ["M5.AREA"]),
  c("M6.LETTERS", 6, "6.algebra", "Letters stand for numbers; writing expressions from words", ["M6.DISTRIB"]),
  c("M6.EQINTRO", 6, "6.algebra", "Idea of an equation; solution by trial", ["M6.LETTERS"]),
  c("M6.RATIO", 6, "6.ratio", "Ratio, proportion and the unitary method; sharing in a ratio", ["M6.FRACTIONS"]),

  // ── Class 7
  c("M7.INTMUL", 7, "7.integers", "Multiplying and dividing integers; sign rules, (−)×(−) = (+)", ["M6.INTADD"]),
  c("M7.FRACMUL", 7, "7.fracdec", "Multiplying and dividing fractions and decimals; fraction of a quantity", ["M6.FRACTIONS", "M6.DECIMALS"]),
  c("M7.MEAN", 7, "7.data", "Mean, median, mode; mean as the balancing / halfway value", ["M6.DATA"]),
  c("M7.PROB", 7, "7.data", "Chance and probability (introduction)"),
  c("M7.SIMPLEEQ", 7, "7.equations", "Solving simple equations; checking a solution by substitution", ["M6.EQINTRO", "M7.INTMUL"]),
  c("M7.ANGLEPAIRS", 7, "7.lines", "Complementary, supplementary, vertically opposite angles; parallel lines and transversals", ["M6.ANGLEMEAS"]),
  c("M7.TRIPROPS", 7, "7.triangle", "Angle-sum property, exterior angle, triangle inequality", ["M7.ANGLEPAIRS"]),
  c("M7.PYTHAG", 7, "7.triangle", "Pythagoras property of right triangles", ["M7.TRIPROPS"]),
  c("M7.CONGRUENCE", 7, "7.congruence", "Congruence of triangles: SSS, SAS, ASA, RHS (AAA is not a congruence rule)", ["M7.TRIPROPS"]),
  c("M7.PERCENT", 7, "7.comparing", "Percentages, profit and loss, simple interest", ["M6.RATIO", "M7.FRACMUL"]),
  c("M7.RATIONAL", 7, "7.rational", "Rational numbers: number line, operations", ["M7.INTMUL", "M7.FRACMUL"]),
  c("M7.PERIMAREA", 7, "7.perimeter", "Area of parallelograms, triangles; circumference and area of circles", ["M6.PERIMAREA"]),
  c("M7.LIKETERMS", 7, "7.algexp", "Terms, coefficients, like and unlike terms; adding and subtracting expressions", ["M6.LETTERS"]),
  c("M7.SUBSTITUTE", 7, "7.algexp", "Finding the value of an expression by substitution", ["M6.LETTERS", "M7.INTMUL"]),
  c("M7.EXPLAWS", 7, "7.exponents", "Laws of exponents: aᵐ·aⁿ, (ab)ⁿ = aⁿbⁿ, but (a + b)ⁿ ≠ aⁿ + bⁿ", ["M7.INTMUL", "M6.DISTRIB"]),
  c("M7.SIGNPOWER", 7, "7.exponents", "Powers of negative numbers: (−a)² versus −a²", ["M7.INTMUL", "M7.EXPLAWS"]),

  // ── Class 8
  c("M8.RATIONAL", 8, "8.rational", "Properties of rational numbers; rational numbers between two numbers", ["M7.RATIONAL"]),
  c("M8.LINEQ", 8, "8.lineq", "Linear equations in one variable with variables on both sides; word problems", ["M7.SIMPLEEQ", "M7.LIKETERMS"]),
  c("M8.QUADS", 8, "8.quads", "Angle sum of polygons; properties of quadrilaterals", ["M7.TRIPROPS"]),
  c("M8.DATA", 8, "8.data", "Grouped data, histograms, pie charts; probability", ["M7.MEAN", "M7.PROB"]),
  c("M8.SQUARES", 8, "8.squares", "Squares and square roots; √ means the positive root, but every positive number has two square roots", ["M7.SIGNPOWER"]),
  c("M8.CUBES", 8, "8.cubes", "Cubes and cube roots", ["M7.EXPLAWS"]),
  c("M8.COMPINT", 8, "8.comparing", "Discount, tax, compound interest", ["M7.PERCENT"]),
  c("M8.MULTEXP", 8, "8.identities", "Multiplying monomials and polynomials with letter coefficients", ["M7.LIKETERMS", "M7.EXPLAWS", "M6.DISTRIB"]),
  c("M8.IDENTITIES", 8, "8.identities", "Standard identities (a ± b)², a² − b², (x + a)(x + b); why (a + b)² has a middle term", ["M8.MULTEXP"]),
  c("M8.MENSURATION", 8, "8.mensuration", "Area of trapezium and polygons; surface area and volume of cube, cuboid, cylinder", ["M7.PERIMAREA"]),
  c("M8.NEGEXP", 8, "8.exponents", "Negative exponents; standard form", ["M7.EXPLAWS"]),
  c("M8.PROPORTION", 8, "8.proportion", "Direct and inverse proportion", ["M6.RATIO"]),
  c("M8.COMMONFACT", 8, "8.factorisation", "Factorising by taking out a common factor (numbers and letters)", ["M8.MULTEXP", "M6.HCFLCM"]),
  c("M8.GROUPING", 8, "8.factorisation", "Factorising by regrouping terms", ["M8.COMMONFACT"]),
  c("M8.FACTIDENT", 8, "8.factorisation", "Factorising using identities (identities backwards)", ["M8.IDENTITIES", "M8.COMMONFACT"]),
  c("M8.ALGDIV", 8, "8.factorisation", "Dividing algebraic expressions; finding the error", ["M8.FACTIDENT"]),
  c("M8.GRAPHS", 8, "8.graphs", "Reading and plotting points; linear graphs", ["M6.NUMLINE"]),

  // ── Class 9
  c("M9.IRRATIONAL", 9, "9.numsys", "Irrational numbers; real numbers on the number line; surds such as √2, √3", ["M8.SQUARES", "M8.RATIONAL"]),
  c("M9.SURDOPS", 9, "9.numsys", "Operations on surds; rationalising the denominator; laws of exponents for real numbers", ["M9.IRRATIONAL", "M8.IDENTITIES"]),
  c("M9.POLYNOT", 9, "9.poly", "Polynomials and p(x) notation; value of a polynomial (p(a + b) ≠ p(a) + p(b) in general)", ["M7.SUBSTITUTE", "M8.MULTEXP"]),
  c("M9.ZEROS", 9, "9.poly", "Zeros of a polynomial; x² − k = 0 has two zeros ±√k", ["M9.POLYNOT", "M8.SQUARES"]),
  c("M9.REMFACT", 9, "9.poly", "Remainder and factor theorems; factorising cubics", ["M9.ZEROS", "M8.FACTIDENT"]),
  c("M9.IDENTITIES", 9, "9.poly", "Algebraic identities incl. (a + b + c)², cubes; factorising with identities and grouping together", ["M8.FACTIDENT", "M8.GROUPING"]),
  c("M9.COORD", 9, "9.coord", "Cartesian plane; quadrants; plotting points; moving along the grid", ["M8.GRAPHS"]),
  c("M9.LIN2", 9, "9.lin2", "Linear equations in two variables; solutions and graphs", ["M8.LINEQ", "M9.COORD"]),
  c("M9.EUCLID", 9, "9.euclid", "Axioms, postulates and simple proofs"),
  c("M9.LINES", 9, "9.lines", "Angles with parallel lines; angle-sum proof", ["M7.ANGLEPAIRS", "M9.EUCLID"]),
  c("M9.TRICONG", 9, "9.triangles", "Congruence criteria with proofs; isosceles triangle properties", ["M7.CONGRUENCE", "M9.LINES"]),
  c("M9.QUADS", 9, "9.quads", "Parallelogram properties; mid-point theorem", ["M8.QUADS", "M9.TRICONG"]),
  c("M9.CIRCLES", 9, "9.circles", "Chords, angles subtended, cyclic quadrilaterals", ["M9.TRICONG"]),
  c("M9.HERON", 9, "9.heron", "Heron's formula", ["M7.PERIMAREA", "M9.IRRATIONAL"]),
  c("M9.SURFACE", 9, "9.surface", "Surface area and volume of cone, sphere, hemisphere", ["M8.MENSURATION"]),
  c("M9.STATS", 9, "9.stats", "Frequency tables, histograms, frequency polygons", ["M8.DATA"]),

  // ── Class 10
  c("M10.FTA", 10, "10.real", "Fundamental theorem of arithmetic; HCF × LCM; choosing HCF vs LCM in word problems", ["M6.HCFLCM"]),
  c("M10.IRRPROOF", 10, "10.real", "Proving irrationality (√2, 3 + 2√5)", ["M9.IRRATIONAL", "M9.EUCLID"]),
  c("M10.POLYZEROS", 10, "10.poly", "Zeros and coefficients: α + β = −b/a, αβ = c/a; forming a polynomial from zeros", ["M9.ZEROS", "M9.IDENTITIES"]),
  c("M10.PAIR", 10, "10.pair", "Pair of linear equations: substitution, elimination; consistency (a₁/a₂, b₁/b₂, c₁/c₂)", ["M9.LIN2", "M8.LINEQ"]),
  c("M10.QUADSOLVE", 10, "10.quad", "Solving quadratics by factorisation (splitting the middle term) and formula", ["M9.ZEROS", "M8.FACTIDENT"]),
  c("M10.PMROOT", 10, "10.quad", "x² = k gives x = ±√k; testing both roots and rejecting with a reason", ["M8.SQUARES", "M9.ZEROS", "M7.SIMPLEEQ"]),
  c("M10.DISCRIM", 10, "10.quad", "Discriminant and nature of roots (including letter coefficients)", ["M10.QUADSOLVE", "M8.IDENTITIES"]),
  c("M10.QUADWORD", 10, "10.quad", "Forming quadratic equations from word problems (speed, digits, area)", ["M10.QUADSOLVE", "M8.LINEQ"]),
  c("M10.APTERM", 10, "10.ap", "AP: nth term aₙ = a + (n − 1)d", ["M8.LINEQ", "M7.SUBSTITUTE"]),
  c("M10.APSUM", 10, "10.ap", "AP: sum of n terms; term vs sum in word problems", ["M10.APTERM"]),
  c("M10.APPROOF", 10, "10.ap", "AP algebra with letters (proofs such as aₘ, aₙ relations)", ["M10.APTERM", "M8.COMMONFACT", "M8.GROUPING"]),
  c("M10.SIMILAR", 10, "10.triangles", "Similar triangles: BPT, AA/SSS/SAS similarity; scale factor and direction of ratios", ["M6.RATIO", "M9.TRICONG"]),
  c("M10.DISTANCE", 10, "10.coord", "Distance formula", ["M9.COORD", "M7.PYTHAG", "M8.SQUARES"]),
  c("M10.MIDPOINT", 10, "10.coord", "Midpoint formula (halfway = average)", ["M9.COORD", "M7.MEAN"]),
  c("M10.SECTION", 10, "10.coord", "Section formula for ratio m : n; ratio as a position", ["M10.MIDPOINT", "M6.RATIO"]),
  c("M10.EQUALPARTS", 10, "10.coord", "Recognising question types: 'n equal parts', 'trisect', 'AP = ⅓AB' → midpoint / section formula", ["M10.SECTION", "M6.FRACTIONS"]),
  c("M10.TRIGRATIO", 10, "10.trig", "Trigonometric ratios of an acute angle (sin is a function of the angle, not a multiplier)", ["M10.SIMILAR", "M7.PYTHAG", "M9.POLYNOT"]),
  c("M10.TRIGVALUES", 10, "10.trig", "Standard values at 0°, 30°, 45°, 60°, 90°", ["M10.TRIGRATIO", "M9.IRRATIONAL"]),
  c("M10.TRIGSPLIT", 10, "10.trig", "sin(A + B) ≠ sin A + sin B; solving equations in A + B, A − B", ["M10.TRIGVALUES", "M9.POLYNOT", "M10.PAIR"]),
  c("M10.TRIGID", 10, "10.trig", "Trigonometric identities and proofs (sin²θ + cos²θ = 1 etc.)", ["M10.TRIGRATIO", "M8.IDENTITIES"]),
  c("M10.HEIGHTS", 10, "10.trigapp", "Heights and distances", ["M10.TRIGVALUES"]),
  c("M10.TANGENT", 10, "10.circles", "Tangent to a circle; tangents from an external point", ["M9.CIRCLES", "M7.PYTHAG"]),
  c("M10.SECTOR", 10, "10.areas", "Area of sector and segment", ["M7.PERIMAREA"]),
  c("M10.COMBSOLID", 10, "10.surface", "Surface area and volume of combined solids", ["M9.SURFACE"]),
  c("M10.STATS", 10, "10.stats", "Mean, median, mode of grouped data", ["M9.STATS", "M7.MEAN"]),
  c("M10.PROB", 10, "10.prob", "Classical probability", ["M8.DATA", "M6.FRACTIONS"]),
];

export const MATHS_CONCEPT_INDEX: Record<string, Concept> = Object.fromEntries(
  MATHS_CONCEPTS.map((x) => [x.id, x]),
);

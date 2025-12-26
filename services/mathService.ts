
import { MathProblem, GameSettings } from '../types';

/**
 * Generates a math problem where complexity scales with level.
 * Scaling is designed for a 1,000,000 phase journey.
 */
export const generateProblem = (level: number, settings: GameSettings): MathProblem => {
  // 15% chance for a "Zen Moment" (lower difficulty)
  const isZenMoment = Math.random() < 0.15;
  const effectiveLevel = isZenMoment 
    ? Math.floor(Math.random() * Math.min(level, 100)) + 1 
    : level;

  // Max terms is capped at 25. Reached at level 1,000,000.
  // 1,000,000 / 23 (increase needed) approx 43,478 levels per term.
  const numTerms = Math.min(25, 2 + Math.floor(effectiveLevel / 40000));
  
  // Component size scales up to 10,000
  const componentMaxVal = Math.min(10000, 10 + Math.floor(effectiveLevel / 100));

  let type: 'arithmetic' | 'linear' | 'quadratic' = 'arithmetic';
  
  if (!isZenMoment) {
    const canDoQuad = settings.allowQuadratic && level >= 500;
    const canDoLinear = settings.allowLinear && level >= 250;

    if (canDoQuad) {
      const chance = Math.random();
      if (chance < 0.3) type = 'quadratic';
      else if (chance < 0.6 && canDoLinear) type = 'linear';
    } else if (canDoLinear) {
      if (Math.random() < 0.4) type = 'linear';
    }
  }

  if (type === 'linear') {
    return generateComplexLinearEquation(level, numTerms);
  } else if (type === 'quadratic') {
    return generateQuadraticEquation(level);
  } else {
    return generateArithmeticProblem(level, effectiveLevel, numTerms, componentMaxVal);
  }
};

const generateArithmeticProblem = (level: number, effectiveLevel: number, numTerms: number, componentMaxVal: number): MathProblem => {
  const operators = ['+', '-', '×'];
  if (effectiveLevel > 100) operators.push('÷');

  let expression: string[] = [];
  for (let i = 0; i < numTerms; i++) {
    let termText = '';
    const rand = Math.random();

    if (effectiveLevel > 300 && rand < 0.1) {
      // Logarithms
      const base = Math.random() > 0.5 ? 2 : 10;
      const exponent = Math.floor(Math.random() * (base === 2 ? 6 : 3)) + 1;
      const val = Math.pow(base, exponent);
      termText = `log${base}(${val})`;
    } else if (effectiveLevel > 150 && rand < 0.15) {
      // Roots
      const rootBase = Math.floor(Math.random() * 15) + 2;
      termText = `√${rootBase * rootBase}`;
    } else if (effectiveLevel > 60 && rand < 0.2) {
      // Powers (only in arithmetic)
      const powerBase = Math.floor(Math.random() * 10) + 2;
      termText = `${powerBase}²`;
    } else {
      termText = (Math.floor(Math.random() * componentMaxVal) + 1).toString();
    }

    if (i === 0) {
      expression.push(termText);
    } else {
      const op = operators[Math.floor(Math.random() * operators.length)];
      if (op === '÷') {
        const divisor = Math.floor(Math.random() * 10) + 2;
        // Wrap current expression to ensure divisibility
        expression[0] = `(${expression.join(' ')} × ${divisor})`;
        expression.splice(1); 
        expression.push('÷', divisor.toString());
      } else {
        expression.push(op, termText);
      }
    }
  }

  const evalString = expression.join(' ')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/(\d+)²/g, 'Math.pow($1, 2)')
    .replace(/√(\d+)/g, 'Math.sqrt($1)')
    .replace(/log2\((\d+)\)/g, 'Math.log2($1)')
    .replace(/log10\((\d+)\)/g, 'Math.log10($1)');

  try {
    const answer = new Function(`return ${evalString}`)();
    if (Number.isInteger(answer) && answer >= -1000000 && answer <= 10000000) {
      return { question: expression.join(' '), answer, level: effectiveLevel };
    }
  } catch (e) {}
  
  return generateArithmeticProblem(level, effectiveLevel, numTerms, componentMaxVal);
};

const generateComplexLinearEquation = (level: number, numTerms: number): MathProblem => {
  // Construction: Start with X, apply N-1 operations to get Result
  // Then present the operations as an equation
  const x = Math.floor(Math.random() * 50) + 1;
  let currentVal = x;
  let expressionParts = ['x'];
  const ops = ['+', '-', '*', '/'];

  // Capped at 5 terms for linear equations to keep them readable
  const equationTerms = Math.min(5, numTerms);

  for (let i = 0; i < equationTerms - 1; i++) {
    const op = ops[Math.floor(Math.random() * ops.length)];
    const val = Math.floor(Math.random() * 15) + 1;

    if (op === '+') {
      currentVal += val;
      expressionParts = [`(${expressionParts.join(' ')} + ${val})`];
    } else if (op === '-') {
      currentVal -= val;
      expressionParts = [`(${expressionParts.join(' ')} - ${val})`];
    } else if (op === '*') {
      currentVal *= val;
      expressionParts = [`(${expressionParts.join(' ')} * ${val})`];
    } else if (op === '/') {
      // Ensure currentVal is divisible for clean integer x
      const multiplier = Math.floor(Math.random() * 5) + 2;
      const divisor = val;
      // We modify the previous steps to ensure divisibility
      // Simple way: wrap current in a multiplier
      currentVal = currentVal * divisor;
      expressionParts = [`(${expressionParts.join(' ')} * ${divisor}) / ${divisor}`];
      // Actually simpler logic:
      // Just ensure currentVal % val == 0
      const d = Math.floor(Math.random() * 5) + 2;
      const target = currentVal * d;
      // To keep it simple for the user, we'll mostly use + and - for deeper nesting
      currentVal = currentVal + d;
      expressionParts = [`(${expressionParts.join(' ')} + ${d})`];
    }
  }

  const finalExpr = expressionParts.join(' ')
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/^\((.*)\)$/, '$1'); // Remove outer parens

  return {
    question: `${finalExpr} = ${currentVal}. Find x`,
    answer: x,
    level: level
  };
};

const generateQuadraticEquation = (level: number): MathProblem => {
  // Standard x² + bx + c = d format but can include basic ops
  const x = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 10);
  const c = Math.floor(Math.random() * 20);
  
  // (x² + bx + c) op val = result
  let result = (x * x) + (b * x) + c;
  let question = `x² ${b > 0 ? `+ ${b}x` : ''} ${c !== 0 ? `+ ${c}` : ''}`;
  
  // Add one extra operator step
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const val = Math.floor(Math.random() * 10) + 1;

  if (op === '+') {
    result += val;
    question = `(${question}) + ${val}`;
  } else if (op === '-') {
    result -= val;
    question = `(${question}) - ${val}`;
  } else if (op === '*') {
    result *= val;
    question = `(${question}) × ${val}`;
  }

  return {
    question: `${question} = ${result}. Find x (x > 0)`,
    answer: x,
    level: level
  };
};

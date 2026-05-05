function createElement(tag) {
  return (first, ...rest) => {
    const el = document.createElement(tag);
    if (first && typeof first === 'object' && !(first instanceof Node)) {
      Object.entries(first).forEach(([k, v]) => el.setAttribute(k, v));
      rest.forEach((c) => { if (c !== null && c !== undefined) el.append(c); });
    } else {
      if (first !== null && first !== undefined) el.append(first);
      rest.forEach((c) => { if (c !== null && c !== undefined) el.append(c); });
    }
    return el;
  };
}

export const div = createElement('div');
export const span = createElement('span');
export const button = createElement('button');
export const img = createElement('img');
export const a = createElement('a');
export const p = createElement('p');
export const ul = createElement('ul');
export const li = createElement('li');
export const h1 = createElement('h1');
export const h2 = createElement('h2');
export const h3 = createElement('h3');

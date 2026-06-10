export const findReactProp = (element: Element) => {
  const props = Object.keys(element);
  const reactProp = props.find(prop => prop.startsWith('__reactProps$'));
  return reactProp;
};

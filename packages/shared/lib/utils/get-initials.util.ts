export const getInitials = (name: string) =>
  name
    ?.match(/(\b\S)?/g)
    ?.join('')
    ?.match(/(^\S|\S$)?/g)
    ?.join('');

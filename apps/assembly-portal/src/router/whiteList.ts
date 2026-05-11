export const useWhiteList = () => {
  const whiteList = ['404', 'sse', 'login'];

  const validateWhiteList = (name: string): boolean => whiteList.includes(name);

  return {
    whiteList,
    validateWhiteList,
  };
};

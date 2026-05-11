export const useWhiteList = () => {
  const whiteList = ['404', 'login'];

  const validateWhiteList = (name: string): boolean => whiteList.includes(name);

  return {
    whiteList,
    validateWhiteList,
  };
};

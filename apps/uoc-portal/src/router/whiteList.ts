/**
 * 获取白名单路由
 * 根据场景需要补充白名单即可
 * @returns whiteList
 */
export const useWhiteList = () => {
	// 免登录，免权限白名单
	const whiteList = ['404', 'sse'];

	const validateWhiteList = (name: string): boolean => whiteList.includes(name);

	return {
		whiteList,
		validateWhiteList,
	};
};

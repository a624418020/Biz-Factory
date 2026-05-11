const REQUIRED_NODE_MAJOR = 20;

export const getCurrentNodeMajor = () => Number(process.versions.node.split('.')[0] || 0);

export const assertSupportedNodeVersion = (requiredMajor = REQUIRED_NODE_MAJOR) => {
  const currentMajor = getCurrentNodeMajor();

  if (currentMajor >= requiredMajor) {
    return;
  }

  const message = [
    `Unsupported Node.js version: ${process.versions.node}`,
    `This workspace requires Node.js ${requiredMajor}.x or newer for public entry scripts.`,
    'Please switch Node before running this command.',
  ].join('\n');

  process.stderr.write(`${message}\n`);
  process.exit(1);
};

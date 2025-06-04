export const serve = () => ({
  executor: '@naxodev/gonx:serve',
  continuous: true,
  options: {
    main: './...',
  },
});

beforeEach(() => {
  if (process.env.TEST_SHOW_CONSOLE_ERRORS === '1') {
    return;
  }

  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

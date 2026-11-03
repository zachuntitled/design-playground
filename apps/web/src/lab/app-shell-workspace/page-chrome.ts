import theme from './theme.module.css';

export const themeClassName = theme.theme;
export const pageChrome = {
  className: `${themeClassName} ${theme.labPage}`,
  compactHeader: true,
};

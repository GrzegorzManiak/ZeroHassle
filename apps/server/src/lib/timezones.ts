export const getBrowserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const isValidTimezone = (timezone: string) => {
  try {
    const supportedValuesOf = (
      Intl as typeof Intl & {
        supportedValuesOf?: (key: 'timeZone') => string[];
      }
    ).supportedValuesOf;

    return supportedValuesOf ? supportedValuesOf('timeZone').includes(timezone) : !!timezone;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * Get the available reporting periods.
 * @returns {Record<string, string>} - Object containing the reporting periods as keys and their display names as values.
 */
export function getReportingPeriodItems() {
    /** @type {Record<string, string>} */
    const items = {};
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    for (let year = currentYear; year <= nextYear; year++) {
        items[`${year}/1`] = `${year}/1`;
        items[`${year}/2`] = `${year}/2`;
    }

    return items;
}

/**
 * Determine the default reporting period based on the current date.
 * @returns {string} - The default period in the form `${year}/${1|2}`.
 */
export function initialSelectedPeriod() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, so we add 1

    // Determine the period based on the current month
    const period = currentMonth <= 6 ? '1' : '2';
    return `${currentYear}/${period}`;
}

/**
 * Get the available reporting categories.
 * @param {import('i18next').i18n} i18n - The i18next instance used to translate the category labels.
 * @returns {Record<string, string>} - Object containing the categories as keys and their display names as values.
 */
export function getReportingCategoryItems(i18n) {
    // @TODO: fetch categories from API instead of hardcoding them here?
    const items = {
        _all: i18n.t('prepare-media-transparency-report.dropdowns.category-name-all'),
        Online: i18n.t('prepare-media-transparency-report.dropdowns.category-name-online'),
        Print: i18n.t('prepare-media-transparency-report.dropdowns.category-name-print'),
        'Out of Home': i18n.t(
            'prepare-media-transparency-report.dropdowns.category-name-out-of-home',
        ),
        Fernsehen: i18n.t('prepare-media-transparency-report.dropdowns.category-name-tv'),
        Hörfunk: i18n.t('prepare-media-transparency-report.dropdowns.category-name-radio'),
    };
    return items;
}

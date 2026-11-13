import {assert} from 'chai';
import Papa from 'papaparse';
import {buildCsvRow, encodeLatin1} from '../src/csv.js';
import {filterSubmissions} from '../src/submissions.js';

import '../src/dbp-prepare-media-transparency-report.js';

suite('Report submission filtering', () => {
    const makeSubmission = (
        identifier,
        submissionState,
        category = 'Online',
        period = '2026/1',
    ) => ({
        identifier,
        submissionState,
        dataFeedElement: JSON.stringify({category, reportingDeadline: period}),
    });

    test('excludes drafts even when their category and period match', () => {
        const submitted = makeSubmission('submitted', 4);
        const draft = makeSubmission('draft', 1);
        const entries = [draft, submitted, makeSubmission('none', 0)];
        assert.deepEqual(filterSubmissions(entries, 'Online', '2026/1'), [submitted]);
    });

    test('includes only completed submissions across all categories in the selected period', () => {
        const online = makeSubmission('online', 4);
        const print = makeSubmission('print', 4, 'Print');
        const entries = [
            online,
            print,
            makeSubmission('draft', 1, 'Print'),
            makeSubmission('other-period', 4, 'Online', '2026/2'),
        ];
        assert.deepEqual(filterSubmissions(entries, '_all', '2026/1'), [online, print]);
        assert.deepEqual(filterSubmissions(entries, 'Print', '2026/1'), [print]);
    });

    test('returns no report entries when only drafts match', () => {
        assert.isEmpty(filterSubmissions([makeSubmission('draft', 1)], '_all', '2026/1'));
    });
});

suite('RTR category-specific CSV rows', () => {
    const submission = {
        mediaName: '<Anderes Medium>',
        otherMediumName: 'Medium; "Example"',
        mediumOwnersName: '<Anderer Medieninhaber>',
        otherMediumOwnersName: 'Example owner',
        amountInEuro: '1234,56',
        campaignTitle: 'Example campaign',
        reportingDeadline: '2026/1',
    };
    const sujetLink = 'https://example.org/sujet';

    for (const category of ['Hörfunk', 'Print', 'Fernsehen', 'Online', 'Out of Home']) {
        test(`exports the RTR column order and values for ${category}`, () => {
            const row = buildCsvRow(
                {
                    ...submission,
                    category,
                    advertisementSubcategory: category === 'Online' ? 'Website' : 'Plakat',
                },
                sujetLink,
            );
            const csv = Papa.unparse([row], {delimiter: ';'});
            const parsed = Papa.parse(csv, {delimiter: ';'});
            const ownerAndDetails = [
                'Medieninhaber',
                'Medieninhaber_andere',
                'Betrag',
                'Kampagnentitel',
                'Sujetlink',
            ];
            const values = [
                submission.mediumOwnersName,
                submission.otherMediumOwnersName,
                '1234.56',
                submission.campaignTitle,
                sujetLink,
            ];
            const headers =
                category === 'Out of Home'
                    ? ['Art_der_Werbeleistung', ...ownerAndDetails]
                    : ['Medium', 'Medium_andere', ...ownerAndDetails];
            if (category !== 'Out of Home') {
                values.unshift(submission.mediaName, submission.otherMediumName);
            }
            if (category === 'Online') {
                headers.unshift('Art_der_Werbeleistung');
                values.unshift('Website');
            } else if (category === 'Out of Home') {
                values.unshift('Plakat');
            }
            assert.isEmpty(parsed.errors);
            assert.deepEqual(parsed.data, [headers, values]);
        });
    }

    test('exports custom mediums with both RTR markers even when the primary owner is empty', () => {
        for (const category of ['Online', 'Print', 'Hörfunk', 'Fernsehen']) {
            const row = buildCsvRow(
                {
                    ...submission,
                    category,
                    mediaName: 'Sonstiges',
                    mediumOwnersName: '',
                    advertisementSubcategory: 'Sonstiges',
                },
                sujetLink,
            );
            assert.equal(row.Medium, '<Anderes Medium>');
            assert.equal(row.Medium_andere, submission.otherMediumName);
            assert.equal(row.Medieninhaber, '<Anderer Medieninhaber>');
            assert.equal(row.Medieninhaber_andere, submission.otherMediumOwnersName);
            if (category === 'Online') {
                assert.equal(row.Art_der_Werbeleistung, 'Sonstiges');
            }
        }
    });

    test('exports a custom owner using the RTR marker and preserves the subtype and company name', () => {
        for (const category of ['Online', 'Print', 'Hörfunk', 'Fernsehen', 'Out of Home']) {
            const row = buildCsvRow(
                {
                    ...submission,
                    category,
                    mediumOwnersName: 'Sonstiges',
                    otherMediumOwnersName: 'Example; "Company"',
                    advertisementSubcategory: 'Sonstiges',
                },
                sujetLink,
            );
            const parsed = Papa.parse(Papa.unparse([row], {delimiter: ';'}), {
                delimiter: ';',
                header: true,
            });
            assert.isEmpty(parsed.errors);
            assert.equal(parsed.data[0].Medieninhaber, '<Anderer Medieninhaber>');
            assert.equal(parsed.data[0].Medieninhaber_andere, 'Example; "Company"');
            if (category === 'Online' || category === 'Out of Home') {
                assert.equal(parsed.data[0].Art_der_Werbeleistung, 'Sonstiges');
            }
        }
    });

    test('exports amounts with a decimal point for every category', () => {
        for (const category of ['Hörfunk', 'Print', 'Fernsehen', 'Online', 'Out of Home']) {
            for (const [amountInEuro, expected] of [
                ['1234,56', '1234.56'],
                ['1234,5', '1234.5'],
                ['1234', '1234'],
                ['0,00', '0.00'],
                [undefined, ''],
            ]) {
                const row = buildCsvRow(
                    {
                        ...submission,
                        category,
                        amountInEuro,
                        advertisementSubcategory: category === 'Online' ? 'Website' : 'Plakat',
                    },
                    sujetLink,
                );
                assert.equal(row.Betrag, expected);
            }
        }
    });

    test('does not infer a custom owner from the subtype or an Out of Home medium value', () => {
        for (const category of ['Online', 'Out of Home']) {
            const row = buildCsvRow(
                {
                    ...submission,
                    category,
                    mediaName: category === 'Out of Home' ? 'Sonstiges' : 'Listed medium',
                    mediumOwnersName: 'Listed owner',
                    otherMediumOwnersName: '',
                    advertisementSubcategory: 'Sonstiges',
                },
                sujetLink,
            );
            assert.equal(row.Medieninhaber, 'Listed owner');
            assert.equal(row.Medieninhaber_andere, '');
            assert.equal(row.Art_der_Werbeleistung, 'Sonstiges');
        }
    });

    test('keeps empty optional fields and missing sujet links in their columns', () => {
        assert.deepEqual(buildCsvRow({category: 'Print'}, undefined), {
            Medium: '',
            Medium_andere: '',
            Medieninhaber: '',
            Medieninhaber_andere: '',
            Betrag: '',
            Kampagnentitel: '',
            Sujetlink: '',
        });
    });

    test('rejects missing and unsupported categories', () => {
        for (const category of [undefined, '_all', 'Invalid']) {
            assert.throws(
                () => buildCsvRow({category}, sujetLink),
                'description-csv-category-error',
            );
        }
    });
});

suite('CSV Latin-1 encoding', () => {
    test('writes Latin-1 bytes into the downloaded file without a BOM', async () => {
        const file = new File([encodeLatin1('Ä;ö;ü;ß\r\n')], 'report.csv', {
            type: 'text/csv;charset=iso-8859-1',
        });
        assert.deepEqual(
            Array.from(new Uint8Array(await file.arrayBuffer())),
            [0xc4, 0x3b, 0xf6, 0x3b, 0xfc, 0x3b, 0xdf, 0x0d, 0x0a],
        );
    });

    test('rejects characters outside Latin-1 instead of corrupting the export', () => {
        for (const text of ['€', '“quoted”', '😀']) {
            assert.throws(() => encodeLatin1(text), 'description-csv-encoding-error');
        }
    });
});

suite('dbp-prepare-media-transparency-report basics', () => {
    let node;

    setup(async () => {
        node = document.createElement('dbp-prepare-media-transparency-report');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    teardown(() => {
        node.remove();
    });

    test('should render', () => {
        assert.isNotNull(node.shadowRoot);
    });
});

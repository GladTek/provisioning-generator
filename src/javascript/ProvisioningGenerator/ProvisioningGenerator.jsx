import React, {useEffect, useRef, useState} from 'react';
import {useMutation, useQuery} from '@apollo/client';
import {useTranslation} from 'react-i18next';
import {Button, Loader, Typography} from '@jahia/moonstone';
import styles from './ProvisioningGenerator.scss';
import {
    DELETE_PROVISIONING_ARCHIVE,
    GENERATE_PROVISIONING_ARCHIVE,
    GET_ARCHIVE_INFO,
    GET_MODULE_LIST
} from './ProvisioningGenerator.gql';

const DOWNLOAD_URL = '/files/default/sites/systemsite/files/provisioning-generator/provisioning-export.zip';
const POLL_INTERVAL_MS = 2000;

const formatDate = isoString => {
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(isoString));
    } catch {
        return isoString;
    }
};

const groupByGroupId = modules => {
    const map = new Map();
    modules.forEach(mod => {
        if (!map.has(mod.groupId)) {
            map.set(mod.groupId, []);
        }

        map.get(mod.groupId).push(mod);
    });
    return map;
};

export const ProvisioningGeneratorAdmin = () => {
    const {t} = useTranslation('provisioning-generator');
    const [generateStatus, setGenerateStatus] = useState(null);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set());
    const generateBtnRef = useRef(null);
    const prevIsLoadingRef = useRef(false);

    useEffect(() => {
        document.title = `${t('label.title')} — Jahia Administration`;
    }, [t]);

    const {
        data: moduleData,
        loading: modulesLoading,
        error: modulesError,
        refetch: refetchModules
    } = useQuery(GET_MODULE_LIST, {fetchPolicy: 'network-only'});

    // Initialise selection to all modules when list loads
    useEffect(() => {
        if (moduleData && moduleData.provisioningGeneratorListModules) {
            setSelected(new Set(moduleData.provisioningGeneratorListModules.map(m => m.symbolicName)));
        }
    }, [moduleData]);

    const {data: infoData, refetch: refetchInfo, startPolling, stopPolling} = useQuery(GET_ARCHIVE_INFO, {
        fetchPolicy: 'network-only'
    });

    const serverGenerating = infoData && infoData.provisioningGeneratorIsGenerating === true;
    const archiveInfo = infoData && infoData.provisioningGeneratorArchiveInfo;

    useEffect(() => {
        if (serverGenerating) {
            startPolling(POLL_INTERVAL_MS);
        } else {
            stopPolling();
        }

        return () => stopPolling();
    }, [serverGenerating, startPolling, stopPolling]);

    const [generate, {loading: mutationGenerating}] = useMutation(GENERATE_PROVISIONING_ARCHIVE);
    const [deleteArchive, {loading: deleting}] = useMutation(DELETE_PROVISIONING_ARCHIVE, {
        refetchQueries: [{query: GET_ARCHIVE_INFO}]
    });

    const generating = mutationGenerating || serverGenerating;
    const isLoading = generating || deleting;

    useEffect(() => {
        if (prevIsLoadingRef.current && !isLoading) {
            generateBtnRef.current?.focus();
        }

        prevIsLoadingRef.current = isLoading;
    }, [isLoading]);

    const allModules = (moduleData && moduleData.provisioningGeneratorListModules) || [];
    const q = search.toLowerCase();
    const filtered = allModules.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.symbolicName.toLowerCase().includes(q) ||
        m.groupId.toLowerCase().includes(q)
    );
    const grouped = groupByGroupId(filtered);
    const allFilteredSelected = filtered.length > 0 && filtered.every(m => selected.has(m.symbolicName));
    const selectedCount = allModules.filter(m => selected.has(m.symbolicName)).length;

    const toggleModule = symbolicName => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(symbolicName)) {
                next.delete(symbolicName);
            } else {
                next.add(symbolicName);
            }

            return next;
        });
    };

    const selectAllFiltered = () => {
        setSelected(prev => {
            const next = new Set(prev);
            filtered.forEach(m => next.add(m.symbolicName));
            return next;
        });
    };

    const deselectAllFiltered = () => {
        setSelected(prev => {
            const next = new Set(prev);
            filtered.forEach(m => next.delete(m.symbolicName));
            return next;
        });
    };

    const handleGenerate = async () => {
        setGenerateStatus(null);
        try {
            const toGenerate = Array.from(selected).filter(
                s => allModules.some(m => m.symbolicName === s)
            );
            const result = await generate({variables: {modules: toGenerate}});
            if (result.data && result.data.provisioningGeneratorGenerate) {
                setGenerateStatus('success');
                refetchInfo();
            } else {
                setGenerateStatus('error');
            }
        } catch (_) {
            setGenerateStatus('error');
        }
    };

    const handleDelete = async () => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(t('label.deleteConfirm'))) {
            return;
        }

        setGenerateStatus(null);
        try {
            await deleteArchive();
        } catch (_) {
            setGenerateStatus('error');
        }
    };

    return (
        <div className={styles.pg_container}>
            <div role="status" aria-live="polite" aria-atomic="true" className={styles.pg_sr_only}>
                {generateStatus === 'success' ? t('label.success') :
                    generating ? t('label.generating') :
                    deleting ? t('label.deleting') : ''}
            </div>
            <div role="alert" aria-live="assertive" aria-atomic="true" className={styles.pg_sr_only}>
                {generateStatus === 'error' ? t('label.error') : ''}
            </div>

            <div className={styles.pg_header}>
                <h2 title={t('label.title')}>{t('label.title')}</h2>
            </div>

            <div className={styles.pg_description}>
                <Typography>{t('label.description')}</Typography>
            </div>

            {generateStatus === 'success' && (
                <div aria-hidden="true" className={`${styles.pg_alert} ${styles['pg_alert--success']}`}>
                    {t('label.success')}
                </div>
            )}
            {generateStatus === 'error' && (
                <div aria-hidden="true" className={`${styles.pg_alert} ${styles['pg_alert--error']}`}>
                    {t('label.error')}
                </div>
            )}

            {/* Module selection panel — hidden while generating */}
            {!generating && (
                <div className={styles.pg_module_panel}>
                    {modulesLoading && (
                        <div className={styles.pg_modules_loading}>
                            <Loader size="small" aria-hidden="true"/>
                        </div>
                    )}

                    {modulesError && (
                        <div className={`${styles.pg_alert} ${styles['pg_alert--error']}`} aria-live="polite">
                            {t('label.modulesLoadError')}
                            <button
                                type="button"
                                className={styles.pg_retry_btn}
                                onClick={() => refetchModules()}
                            >
                                {t('label.retry')}
                            </button>
                        </div>
                    )}

                    {!modulesLoading && !modulesError && (
                        <>
                            <div className={styles.pg_search_row}>
                                <input
                                    type="search"
                                    className={styles.pg_search_input}
                                    placeholder={t('label.searchPlaceholder')}
                                    aria-label={t('label.searchAriaLabel')}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                                {filtered.length > 0 && (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.pg_text_btn}
                                            disabled={allFilteredSelected}
                                            onClick={selectAllFiltered}
                                        >
                                            {t('label.selectAll')}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.pg_text_btn}
                                            disabled={filtered.every(m => !selected.has(m.symbolicName))}
                                            onClick={deselectAllFiltered}
                                        >
                                            {t('label.deselectAll')}
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className={styles.pg_module_list} role="list">
                                {filtered.length === 0 && (
                                    <p className={styles.pg_no_results}>{t('label.noModules')}</p>
                                )}
                                {[...grouped.entries()].map(([groupId, mods]) => (
                                    <div key={groupId} className={styles.pg_group}>
                                        <div className={styles.pg_group_header} aria-hidden="true">
                                            {groupId}
                                        </div>
                                        {mods.map(mod => (
                                            <label
                                                key={mod.symbolicName}
                                                className={styles.pg_module_row}
                                                role="listitem"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className={styles.pg_checkbox}
                                                    checked={selected.has(mod.symbolicName)}
                                                    onChange={() => toggleModule(mod.symbolicName)}
                                                />
                                                <span className={styles.pg_module_name}>{mod.name}</span>
                                                <span className={styles.pg_module_meta}>
                                                    {mod.symbolicName} — {mod.version}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            <p className={styles.pg_selection_count}>
                                {t('label.selectionCount', {count: selectedCount, total: allModules.length})}
                            </p>
                        </>
                    )}
                </div>
            )}

            <div className={styles.pg_actions}>
                {isLoading ? (
                    <div className={styles.pg_loading} aria-hidden="true">
                        <Loader size="big" aria-hidden="true"/>
                        <Typography className={styles.pg_loading_text}>
                            {generating ? t('label.generating') : t('label.deleting')}
                        </Typography>
                    </div>
                ) : (
                    <Button
                        ref={generateBtnRef}
                        type="button"
                        label={t('label.generate', {count: selectedCount})}
                        variant="primary"
                        isDisabled={selectedCount === 0 || modulesLoading || Boolean(modulesError)}
                        onClick={handleGenerate}
                    />
                )}
            </div>

            {archiveInfo && !isLoading && (
                <div className={styles.pg_archive_section}>
                    <p className={styles.pg_created_at}>
                        {t('label.createdAt', {date: formatDate(archiveInfo.createdAt)})}
                    </p>
                    <div className={styles.pg_archive_actions}>
                        <a
                            href={DOWNLOAD_URL}
                            download="provisioning-export.zip"
                            className={styles.pg_download_link}
                            aria-label={t('label.downloadAriaLabel')}
                        >
                            {t('label.download')}
                        </a>
                        <button
                            type="button"
                            className={styles.pg_delete_btn}
                            onClick={handleDelete}
                        >
                            {t('label.delete')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProvisioningGeneratorAdmin;

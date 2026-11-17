import { useCallback, useEffect, useState } from 'react';
import type { LectureItem, VideoLink } from '../data/knowledgeHubData';

export type WatchStatus = 'unwatched' | 'completed' | 'reviewed';

export interface LectureStudyEntry {
  status: WatchStatus;
  timestamp?: string;
  note?: string;
  updatedAt: number;
}

export interface CustomLectureResources {
  slides?: VideoLink[];
  summaries?: VideoLink[];
}

const PROGRESS_STORAGE_KEY = 'pannawat-study-progress-v1';
const CUSTOM_RESOURCES_KEY = 'pannawat-lecture-resources-v1';

const DEFAULT_ENTRY: LectureStudyEntry = {
  status: 'unwatched',
  updatedAt: 0,
};

export function useStudyProgress() {
  const [progressMap, setProgressMap] = useState<Record<string, LectureStudyEntry>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, LectureStudyEntry>) : {};
    } catch {
      return {};
    }
  });

  const [resourceMap, setResourceMap] = useState<Record<string, CustomLectureResources>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(CUSTOM_RESOURCES_KEY);
      return raw ? (JSON.parse(raw) as Record<string, CustomLectureResources>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));
  }, [progressMap]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_RESOURCES_KEY, JSON.stringify(resourceMap));
  }, [resourceMap]);

  const getEntry = useCallback(
    (lectureId: string): LectureStudyEntry => progressMap[lectureId] ?? DEFAULT_ENTRY,
    [progressMap]
  );

  const setStatus = useCallback((lectureId: string, status: WatchStatus) => {
    setProgressMap((prev) => {
      const existing = prev[lectureId] ?? DEFAULT_ENTRY;
      return {
        ...prev,
        [lectureId]: {
          ...existing,
          status,
          updatedAt: Date.now(),
        },
      };
    });
  }, []);

  const cycleStatus = useCallback((lectureId: string) => {
    setProgressMap((prev) => {
      const existing = prev[lectureId] ?? DEFAULT_ENTRY;
      const next: WatchStatus =
        existing.status === 'unwatched'
          ? 'completed'
          : existing.status === 'completed'
            ? 'reviewed'
            : 'unwatched';
      return {
        ...prev,
        [lectureId]: {
          ...existing,
          status: next,
          updatedAt: Date.now(),
        },
      };
    });
  }, []);

  const updateMeta = useCallback(
    (lectureId: string, patch: { timestamp?: string; note?: string }) => {
      setProgressMap((prev) => {
        const existing = prev[lectureId] ?? DEFAULT_ENTRY;
        return {
          ...prev,
          [lectureId]: {
            ...existing,
            ...(patch.timestamp !== undefined ? { timestamp: patch.timestamp } : {}),
            ...(patch.note !== undefined ? { note: patch.note } : {}),
            updatedAt: Date.now(),
          },
        };
      });
    },
    []
  );

  const addCustomResource = useCallback(
    (lectureId: string, kind: 'slides' | 'summaries', link: VideoLink) => {
      setResourceMap((prev) => {
        const current = prev[lectureId] ?? {};
        const list = current[kind] ?? [];
        if (list.some((item) => item.url === link.url)) return prev;
        return {
          ...prev,
          [lectureId]: {
            ...current,
            [kind]: [...list, link],
          },
        };
      });
    },
    []
  );

  const removeCustomResource = useCallback(
    (lectureId: string, kind: 'slides' | 'summaries', url: string) => {
      setResourceMap((prev) => {
        const current = prev[lectureId];
        if (!current) return prev;
        const filtered = (current[kind] ?? []).filter((item) => item.url !== url);
        return {
          ...prev,
          [lectureId]: {
            ...current,
            [kind]: filtered,
          },
        };
      });
    },
    []
  );

  const getCustomResources = useCallback(
    (lectureId: string): CustomLectureResources => resourceMap[lectureId] ?? {},
    [resourceMap]
  );

  const summarizeLectures = useCallback(
    (lectures: LectureItem[]) => {
      let watched = 0;
      let reviewed = 0;
      let unwatchedWithVideo = 0;
      let totalWithVideo = 0;

      for (const item of lectures) {
        const status = (progressMap[item.id] ?? DEFAULT_ENTRY).status;
        if (status === 'completed') watched += 1;
        else if (status === 'reviewed') {
          watched += 1;
          reviewed += 1;
        }

        if (item.links.length > 0) {
          totalWithVideo += 1;
          if (status === 'unwatched') unwatchedWithVideo += 1;
        }
      }

      const total = lectures.length;
      const unwatched = total - watched;
      const percent = total > 0 ? Math.round((watched / total) * 100) : 0;

      return {
        total,
        watched,
        reviewed,
        unwatched,
        unwatchedWithVideo,
        totalWithVideo,
        percent,
      };
    },
    [progressMap]
  );

  return {
    progressMap,
    getEntry,
    setStatus,
    cycleStatus,
    updateMeta,
    addCustomResource,
    removeCustomResource,
    getCustomResources,
    summarizeLectures,
  };
}

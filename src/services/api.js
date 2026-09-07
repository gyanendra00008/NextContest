// API service for NextContest
import { fetchUpcomingContests, fetchRecentContests } from '@qatadaazzeh/atcoder-api';

const BACKEND_URLS = [
  import.meta.env.VITE_API_BASE_URL,
  "http://localhost:8000",
  "https://nextcontest-1.onrender.com"
].filter(Boolean);

async function requestWithFallback(endpoint, options = {}) {
  let lastError = null;

  for (const baseUrl of BACKEND_URLS) {
    try {
      const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 12000);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {})
        }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      lastError = err;
      // Try next URL
    }
  }

  throw lastError || new Error(`Failed to fetch from all backend URLs for ${endpoint}`);
}

/**
 * Normalizes LeetCode response
 */
export function normalizeLeetCode(data) {
  if (data?.upcoming_contests && data?.past_contests) {
    return {
      upcoming: data.upcoming_contests,
      past: data.past_contests,
      live: []
    };
  }

  const upcomingRaw = data?.upcoming_contest?.data?.contestV2UpcomingContests || [];
  const pastRaw = data?.past_contest?.data?.contestV2HistoryContests?.contests || [];

  const upcoming = upcomingRaw.map(c => ({
    id: c.titleSlug || c.title,
    name: c.title,
    platform: 'LeetCode',
    platformKey: 'leetcode',
    url: `https://leetcode.com/contest/${c.titleSlug}`,
    startTime: c.startTime, // in seconds
    duration: c.duration || 5400,
    status: 'UPCOMING',
    cardImg: c.cardImg
  }));

  const past = pastRaw.map(c => ({
    id: c.titleSlug || c.title,
    name: c.title,
    platform: 'LeetCode',
    platformKey: 'leetcode',
    url: `https://leetcode.com/contest/${c.titleSlug}`,
    startTime: c.startTime, // in seconds
    duration: c.duration || 5400,
    status: 'FINISHED',
    cardImg: c.cardImg
  }));

  return { upcoming, past, live: [] };
}

/**
 * Normalizes Codeforces response
 */
export function normalizeCodeforces(data) {
  if (data?.upcoming_contests && data?.past_contests) {
    return {
      upcoming: data.upcoming_contests,
      past: data.past_contests,
      live: (data.upcoming_contests || []).filter(c => c.status === 'LIVE')
    };
  }

  const legacyList = data?.contest_list || [];
  const upcoming = [];
  const past = [];
  const live = [];

  legacyList.forEach((row, idx) => {
    // row: [name, phase, durationSeconds, startTimeSeconds]
    const [name, phase, duration, startTime] = row;
    const isLive = phase === 'CODING';
    const isUpcoming = phase === 'BEFORE';
    const item = {
      id: `cf-${idx}`,
      name,
      platform: 'Codeforces',
      platformKey: 'codeforces',
      url: 'https://codeforces.com/contests',
      startTime, // in seconds
      duration: duration || 7200,
      phase,
      status: isLive ? 'LIVE' : (isUpcoming ? 'UPCOMING' : 'FINISHED')
    };

    if (isLive) {
      live.push(item);
      upcoming.push(item);
    } else if (isUpcoming) {
      upcoming.push(item);
    } else {
      past.push(item);
    }
  });

  return { upcoming, past, live };
}

/**
 * Normalizes CodeChef response
 */
export function normalizeCodeChef(data) {
  if (data?.upcoming_contests || data?.past_contests) {
    return {
      upcoming: data.upcoming_contests || [],
      past: data.past_contests || [],
      live: data.live_contests || []
    };
  }

  const rawList = data?.data || [];
  const upcoming = rawList.map(c => {
    const durMins = Number(c.contest_duration) || 120;
    return {
      id: c.contest_code || c.contest_name,
      name: c.contest_name,
      platform: 'CodeChef',
      platformKey: 'codechef',
      url: `https://www.codechef.com/${c.contest_code || 'contests'}`,
      startTime: c.contest_start_date_iso || c.contest_start_date,
      duration: durMins * 60,
      status: 'UPCOMING'
    };
  });

  return { upcoming, past: [], live: [] };
}

/**
 * Normalizes AtCoder response (from Backend or @qatadaazzeh/atcoder-api)
 */
export function normalizeAtCoder(data) {
  if (data?.upcoming_contests || data?.past_contests || data?.live_contests) {
    const formatItem = (c, defaultStatus) => ({
      id: c.id || c.contestId || c.name || c.contestName,
      name: c.name || c.contestName,
      platform: 'AtCoder',
      platformKey: 'atcoder',
      url: c.url || c.contestUrl || `https://atcoder.jp/contests/${c.id || c.contestId || ''}`,
      startTime: c.startTime || c.contestTime,
      startDateStr: c.startDateStr || c.contestTime,
      duration: c.duration || 7200,
      status: c.status || defaultStatus,
      rated: c.rated ?? (c.isRated ? 'Rated' : '-')
    });

    return {
      upcoming: (data.upcoming_contests || []).map(c => formatItem(c, 'UPCOMING')),
      past: (data.past_contests || []).map(c => formatItem(c, 'FINISHED')),
      live: (data.live_contests || []).map(c => formatItem(c, 'LIVE'))
    };
  }

  // If array directly from @qatadaazzeh/atcoder-api or custom list
  const rawList = Array.isArray(data) ? data : (data?.contests || []);
  const upcoming = [];
  const past = [];
  const live = [];
  const nowSec = Math.floor(Date.now() / 1000);

  rawList.forEach((c) => {
    let startSec = 0;
    if (typeof c.startTime === 'number') {
      startSec = c.startTime;
    } else if (typeof c.contestTime === 'string') {
      startSec = Math.floor(new Date(c.contestTime.replace(' ', 'T')).getTime() / 1000);
    } else if (c.startTime) {
      startSec = Math.floor(new Date(c.startTime).getTime() / 1000);
    }

    let durSec = 7200;
    if (typeof c.duration === 'number') {
      durSec = c.duration;
    } else if (typeof c.contestDuration === 'string') {
      const parts = c.contestDuration.split(':').map(Number);
      if (parts.length === 2) durSec = parts[0] * 3600 + parts[1] * 60;
      else if (parts.length === 3) durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    const isLive = startSec > 0 && nowSec >= startSec && nowSec < startSec + durSec;
    const isPast = startSec > 0 && nowSec >= startSec + durSec;
    const isUpcoming = startSec > 0 ? nowSec < startSec : true;

    const item = {
      id: c.contestId || c.id || c.contestName || c.name,
      name: c.contestName || c.name,
      platform: 'AtCoder',
      platformKey: 'atcoder',
      url: c.contestUrl || c.url || (c.contestId ? `https://atcoder.jp/contests/${c.contestId}` : 'https://atcoder.jp/contests'),
      startTime: startSec || c.contestTime || c.startTime,
      duration: durSec,
      status: isLive ? 'LIVE' : (isUpcoming ? 'UPCOMING' : 'FINISHED'),
      rated: c.isRated !== undefined ? (c.isRated ? 'Rated' : '-') : '-'
    };

    if (isLive) {
      live.push(item);
      upcoming.push(item);
    } else if (isUpcoming) {
      upcoming.push(item);
    } else if (isPast) {
      past.push(item);
    } else {
      past.push(item);
    }
  });

  return { upcoming, past, live };
}

/**
 * Fallback to @qatadaazzeh/atcoder-api package
 */
export async function fetchAtCoderFromPackage() {
  try {
    const [upcoming, recent] = await Promise.all([
      fetchUpcomingContests().catch(() => []),
      fetchRecentContests().catch(() => [])
    ]);
    return normalizeAtCoder({
      upcoming_contests: upcoming,
      past_contests: recent
    });
  } catch (err) {
    console.warn("Failed to fetch from @qatadaazzeh/atcoder-api:", err);
    return { upcoming: [], past: [], live: [] };
  }
}

/**
 * Fetch platform data
 */
export async function fetchPlatformData(platform) {
  if (platform === 'All') {
    return fetchAllPlatforms();
  }

  if (platform === 'Atcoder') {
    try {
      const data = await requestWithFallback('Atcoder');
      return normalizeAtCoder(data);
    } catch (backendErr) {
      console.warn('Backend /Atcoder failed, attempting @qatadaazzeh/atcoder-api fallback:', backendErr);
      const pkgData = await fetchAtCoderFromPackage();
      if (pkgData.upcoming.length > 0 || pkgData.past.length > 0) {
        return pkgData;
      }
      throw backendErr;
    }
  }

  const data = await requestWithFallback(platform);
  
  if (platform === 'Leetcode') return normalizeLeetCode(data);
  if (platform === 'Codeforces') return normalizeCodeforces(data);
  if (platform === 'Codechef') return normalizeCodeChef(data);

  return { upcoming: [], past: [], live: [] };
}

/**
 * Fetch All platforms in parallel
 */
export async function fetchAllPlatforms() {
  try {
    const allRes = await requestWithFallback('All');
    if (allRes?.upcoming_contests && allRes?.leetcode && allRes?.codeforces && allRes?.codechef) {
      const lcNorm = normalizeLeetCode(allRes.leetcode);
      const cfNorm = normalizeCodeforces(allRes.codeforces);
      const ccNorm = normalizeCodeChef(allRes.codechef);

      let atNorm = { upcoming: [], past: [], live: [] };
      if (allRes.atcoder) {
        atNorm = normalizeAtCoder(allRes.atcoder);
      } else {
        try {
          const atData = await requestWithFallback('Atcoder');
          atNorm = normalizeAtCoder(atData);
        } catch {
          atNorm = await fetchAtCoderFromPackage();
        }
      }

      const upcoming = [
        ...lcNorm.upcoming,
        ...cfNorm.upcoming,
        ...ccNorm.upcoming,
        ...atNorm.upcoming
      ].sort((a, b) => {
        const timeA = typeof a.startTime === 'number' ? a.startTime * 1000 : new Date(a.startTime).getTime();
        const timeB = typeof b.startTime === 'number' ? b.startTime * 1000 : new Date(b.startTime).getTime();
        return timeA - timeB;
      });

      const past = [
        ...lcNorm.past,
        ...cfNorm.past,
        ...ccNorm.past,
        ...atNorm.past
      ].sort((a, b) => {
        const timeA = typeof a.startTime === 'number' ? a.startTime * 1000 : new Date(a.startTime).getTime();
        const timeB = typeof b.startTime === 'number' ? b.startTime * 1000 : new Date(b.startTime).getTime();
        return timeB - timeA;
      });

      const live = [
        ...lcNorm.live,
        ...cfNorm.live,
        ...ccNorm.live,
        ...atNorm.live
      ];

      return { upcoming, past, live };
    }
  } catch (e) {
    console.warn("Direct /All endpoint failed, fetching individually:", e);
  }

  // Parallel fallback
  const [lcRes, cfRes, ccRes, atRes] = await Promise.allSettled([
    requestWithFallback('Leetcode'),
    requestWithFallback('Codeforces'),
    requestWithFallback('Codechef'),
    requestWithFallback('Atcoder').catch(() => fetchAtCoderFromPackage())
  ]);

  const lcNorm = lcRes.status === 'fulfilled' ? normalizeLeetCode(lcRes.value) : { upcoming: [], past: [], live: [] };
  const cfNorm = cfRes.status === 'fulfilled' ? normalizeCodeforces(cfRes.value) : { upcoming: [], past: [], live: [] };
  const ccNorm = ccRes.status === 'fulfilled' ? normalizeCodeChef(ccRes.value) : { upcoming: [], past: [], live: [] };
  const atNorm = atRes.status === 'fulfilled' ? normalizeAtCoder(atRes.value) : { upcoming: [], past: [], live: [] };

  const upcoming = [
    ...lcNorm.upcoming,
    ...cfNorm.upcoming,
    ...ccNorm.upcoming,
    ...atNorm.upcoming
  ].sort((a, b) => {
    const timeA = typeof a.startTime === 'number' ? a.startTime * 1000 : new Date(a.startTime).getTime();
    const timeB = typeof b.startTime === 'number' ? b.startTime * 1000 : new Date(b.startTime).getTime();
    return timeA - timeB;
  });

  const past = [
    ...lcNorm.past,
    ...cfNorm.past,
    ...ccNorm.past,
    ...atNorm.past
  ].sort((a, b) => {
    const timeA = typeof a.startTime === 'number' ? a.startTime * 1000 : new Date(a.startTime).getTime();
    const timeB = typeof b.startTime === 'number' ? b.startTime * 1000 : new Date(b.startTime).getTime();
    return timeB - timeA;
  });

  const live = [
    ...lcNorm.live,
    ...cfNorm.live,
    ...ccNorm.live,
    ...atNorm.live
  ];

  return { upcoming, past, live };
}

/**
 * Fetch problem metadata statistics (total, easy, medium, hard, free, paid, tags)
 */
export async function fetchProblemStats() {
  return await requestWithFallback('leetcode/problems/stats');
}

/**
 * Filter & search problems from local database
 */
export async function searchProblems(params = {}) {
  const query = new URLSearchParams(params).toString();
  const endpoint = query ? `leetcode/problems/search?${query}` : 'leetcode/problems/search';
  return await requestWithFallback(endpoint);
}

/**
 * Fetch end-to-end personalized contest for a LeetCode username
 */
export async function fetchPersonalizedContest(username, seed = null) {
  const query = seed ? `?seed=${encodeURIComponent(seed)}` : '';
  return await requestWithFallback(`leetcode/${username}/personalized-contest${query}`);
}

/**
 * Deterministically generate a personalized contest from profile & AI coach analysis
 */
export async function generatePersonalizedContest(payload) {
  return await requestWithFallback('leetcode/personalized-contest', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Fetch AI CP coach analysis for a LeetCode user
 */
export async function fetchAIAnalysis(username) {
  return await requestWithFallback(`leetcode/${encodeURIComponent(username)}/ai-analysis`);
}

/**
 * Fetch full profile analysis for a LeetCode user
 */
export async function fetchUserProfile(username) {
  return await requestWithFallback(`leetcode/${encodeURIComponent(username)}/analysis`);
}


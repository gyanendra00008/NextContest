// API service for NextContest

const BACKEND_URLS = [
  import.meta.env.VITE_API_BASE_URL,
  "http://localhost:8000",
  "https://nextcontest-1.onrender.com"
].filter(Boolean);

async function requestWithFallback(endpoint) {
  let lastError = null;

  for (const baseUrl of BACKEND_URLS) {
    try {
      const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
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
 * Fetch platform data
 */
export async function fetchPlatformData(platform) {
  if (platform === 'All') {
    return fetchAllPlatforms();
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

      const upcoming = [
        ...lcNorm.upcoming,
        ...cfNorm.upcoming,
        ...ccNorm.upcoming
      ].sort((a, b) => {
        const timeA = typeof a.startTime === 'number' ? a.startTime * 1000 : new Date(a.startTime).getTime();
        const timeB = typeof b.startTime === 'number' ? b.startTime * 1000 : new Date(b.startTime).getTime();
        return timeA - timeB;
      });

      const past = [
        ...lcNorm.past,
        ...cfNorm.past,
        ...ccNorm.past
      ].sort((a, b) => {
        const timeA = typeof a.startTime === 'number' ? a.startTime * 1000 : new Date(a.startTime).getTime();
        const timeB = typeof b.startTime === 'number' ? b.startTime * 1000 : new Date(b.startTime).getTime();
        return timeB - timeA;
      });

      const live = [
        ...lcNorm.live,
        ...cfNorm.live,
        ...ccNorm.live
      ];

      return { upcoming, past, live };
    }
  } catch (e) {
    console.warn("Direct /All endpoint failed, fetching individually:", e);
  }

  // Parallel fallback
  const [lcRes, cfRes, ccRes] = await Promise.allSettled([
    requestWithFallback('Leetcode'),
    requestWithFallback('Codeforces'),
    requestWithFallback('Codechef')
  ]);

  const lcNorm = lcRes.status === 'fulfilled' ? normalizeLeetCode(lcRes.value) : { upcoming: [], past: [], live: [] };
  const cfNorm = cfRes.status === 'fulfilled' ? normalizeCodeforces(cfRes.value) : { upcoming: [], past: [], live: [] };
  const ccNorm = ccRes.status === 'fulfilled' ? normalizeCodeChef(ccRes.value) : { upcoming: [], past: [], live: [] };

  const upcoming = [
    ...lcNorm.upcoming,
    ...cfNorm.upcoming,
    ...ccNorm.upcoming
  ].sort((a, b) => {
    const timeA = typeof a.startTime === 'number' ? a.startTime * 1000 : new Date(a.startTime).getTime();
    const timeB = typeof b.startTime === 'number' ? b.startTime * 1000 : new Date(b.startTime).getTime();
    return timeA - timeB;
  });

  const past = [
    ...lcNorm.past,
    ...cfNorm.past,
    ...ccNorm.past
  ].sort((a, b) => {
    const timeA = typeof a.startTime === 'number' ? a.startTime * 1000 : new Date(a.startTime).getTime();
    const timeB = typeof b.startTime === 'number' ? b.startTime * 1000 : new Date(b.startTime).getTime();
    return timeB - timeA;
  });

  const live = [
    ...lcNorm.live,
    ...cfNorm.live,
    ...ccNorm.live
  ];

  return { upcoming, past, live };
}

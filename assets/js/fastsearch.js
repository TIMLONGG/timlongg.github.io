import * as params from '@params';

const resList = document.getElementById('searchResults');
const sInput = document.getElementById('searchInput');
const searchBox = document.getElementById('searchbox');

let fuse;
let currentElement = null;
let firstResult = null;
let lastResult = null;

const defaultFuseOptions = {
    distance: 100,
    threshold: 0.4,
    ignoreLocation: true,
    keys: ['title', 'permalink', 'summary', 'content']
};

const buildFuseOptions = () => {
    if (!params.fuseOpts) return defaultFuseOptions;

    return {
        isCaseSensitive: params.fuseOpts.iscasesensitive ?? false,
        includeScore: params.fuseOpts.includescore ?? false,
        // 搜索结果需要显示命中位置，因此始终请求 Fuse 返回匹配区间。
        includeMatches: true,
        minMatchCharLength: params.fuseOpts.minmatchcharlength ?? 1,
        shouldSort: params.fuseOpts.shouldsort ?? true,
        findAllMatches: params.fuseOpts.findallmatches ?? false,
        keys: params.fuseOpts.keys ?? defaultFuseOptions.keys,
        location: params.fuseOpts.location ?? 0,
        threshold: params.fuseOpts.threshold ?? defaultFuseOptions.threshold,
        distance: params.fuseOpts.distance ?? defaultFuseOptions.distance,
        ignoreLocation: params.fuseOpts.ignorelocation ?? defaultFuseOptions.ignoreLocation
    };
};

const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(...args), delay);
    };
};

const reset = () => {
    currentElement = null;
    firstResult = null;
    lastResult = null;
    resList.innerHTML = '';
    sInput.value = '';
    sInput.focus();
};

const setActiveResult = (element) => {
    document.querySelectorAll('.focus').forEach((item) => item.classList.remove('focus'));
    if (!element) return;

    element.focus();
    element.parentElement?.classList.add('focus');
    currentElement = element;
};

// 按传入的 key 顺序优先取匹配：命中正文时优先用 content，而不是先命中到 summary。
const findMatch = (result, keys) =>
    keys.map((key) => result.matches?.find((match) => match.key === key)).find(Boolean);

const appendHighlightedText = (element, text, indices = []) => {
    const ranges = [...indices]
        .map(([start, end]) => [Math.max(0, start), Math.min(text.length - 1, end)])
        .filter(([start, end]) => start <= end)
        .sort(([left], [right]) => left - right);
    let cursor = 0;

    for (const [start, end] of ranges) {
        if (start > cursor) element.appendChild(document.createTextNode(text.slice(cursor, start)));

        const mark = document.createElement('mark');
        mark.textContent = text.slice(Math.max(cursor, start), end + 1);
        element.appendChild(mark);
        cursor = Math.max(cursor, end + 1);
    }

    if (cursor < text.length) element.appendChild(document.createTextNode(text.slice(cursor)));
};

const CONTEXT_LEAD = 52;
const CONTEXT_LENGTH = 160;
const CONTEXT_LABELS = { tags: 'Tags', categories: 'Category' };

const createContext = (result) => {
    const match = findMatch(result, ['content', 'summary', 'tags', 'categories']);
    const item = result.item;
    // 命中正文/摘要时围绕命中位置截取；只命中标题/标签或链接时退化为正文开头，
    // 保证每条搜索结果都有一行可读上下文，而不是只剩标题。
    const source = String((match ? item[match.key] : '') || item.content || item.summary || '');
    if (!source) return null;

    const indices = match?.indices ?? [];
    const [matchStart] = indices[0] ?? [0];
    const start = Math.max(0, matchStart - CONTEXT_LEAD);
    const end = Math.min(source.length, start + CONTEXT_LEAD + CONTEXT_LENGTH);

    const context = document.createElement('span');
    context.className = 'search-result-context';
    context.setAttribute('aria-label', 'Match context');

    // 命中标签/分类时加个前缀，说明这段文字来自哪里。
    const label = CONTEXT_LABELS[match?.key];
    if (label) context.appendChild(document.createTextNode(label + ': '));

    if (start > 0) context.appendChild(document.createTextNode('…'));
    const clippedIndices = indices
        .filter(([left, right]) => right >= start && left < end)
        .map(([left, right]) => [Math.max(left, start) - start, Math.min(right, end - 1) - start]);
    appendHighlightedText(context, source.slice(start, end), clippedIndices);
    if (end < source.length) context.appendChild(document.createTextNode('…'));

    return context;
};

const renderResults = (results) => {
    if (!Array.isArray(results) || results.length === 0) {
        resList.innerHTML = '';
        firstResult = lastResult = currentElement = null;
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const result of results) {
        const li = document.createElement('li');
        const body = document.createElement('div');
        body.className = 'search-result-body';
        const title = document.createElement('span');
        title.className = 'search-result-title';
        const titleMatch = findMatch(result, ['title']);
        appendHighlightedText(title, result.item.title, titleMatch?.indices);
        body.appendChild(title);

        const context = createContext(result);
        if (context) body.appendChild(context);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.classList.add('feather', 'feather-chevrons-right');
        svg.innerHTML = '<polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline>';

        const link = document.createElement('a');
        link.className = 'entry-link';
        link.href = result.item.permalink;
        link.setAttribute('aria-label', result.item.title);
        li.append(body, svg, link);
        fragment.appendChild(li);
    }

    resList.innerHTML = '';
    resList.appendChild(fragment);
    firstResult = resList.firstElementChild;
    lastResult = resList.lastElementChild;
};

const performSearch = () => {
    if (!fuse) return;

    const query = sInput.value.trim();
    if (!query) {
        renderResults([]);
        return;
    }

    const searchOptions = params.fuseOpts?.limit ? { limit: params.fuseOpts.limit } : undefined;
    renderResults(searchOptions ? fuse.search(query, searchOptions) : fuse.search(query));
};

const initSearch = async () => {
    if (!sInput || !resList) return;

    sInput.disabled = false;
    sInput.focus();

    try {
        const response = await fetch(params.searchIndexURL ?? '../index.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Search index load failed: ${response.status}`);

        const data = await response.json();
        if (data) fuse = new Fuse(data, buildFuseOptions());
    } catch (error) {
        console.error(error);
    }
};

window.addEventListener('load', initSearch);
sInput?.addEventListener('input', debounce(performSearch, 150));
sInput?.addEventListener('search', () => {
    if (!sInput.value) reset();
});

document.addEventListener('keydown', (event) => {
    const { key } = event;
    const active = document.activeElement;
    const isInSearchBox = searchBox?.contains(active);

    if (key === 'Escape') {
        reset();
        return;
    }
    if (!firstResult || !isInSearchBox) return;

    if (key === 'ArrowDown') {
        event.preventDefault();
        if (active === sInput) {
            setActiveResult(firstResult.querySelector('.entry-link'));
        } else if (active?.parentElement !== lastResult) {
            setActiveResult(active?.parentElement?.nextElementSibling?.querySelector('.entry-link'));
        }
    } else if (key === 'ArrowUp') {
        event.preventDefault();
        if (active?.parentElement === firstResult) {
            setActiveResult(sInput);
        } else if (active !== sInput) {
            setActiveResult(active?.parentElement?.previousElementSibling?.querySelector('.entry-link'));
        }
    } else if (key === 'ArrowRight' && active?.matches?.('.entry-link')) {
        active.click();
    }
});

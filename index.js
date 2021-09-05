const removeMd = require("remove-markdown");
const path = require("path");
const moment = require('moment');

/**
 * get file name without extension
 * @param filePath {String}
 * @returns {String}
 */
function getFileNameWithoutExtension(filePath) {
  return filePath
    .match(/[^\/\\]+$/i)[0]  // get string after last /
    .match(/^[^.]+/i)[0];    // get string before first .
}


/**
 * guess headings from Markdown content
 * @param content {String} Markdown content
 * @returns {String | null} title,
 */
function getFirstMarkdownHeading(content) {
  if (!content)
    return null;
  const headings = content.match(/# .+/);
  if (headings && headings.length > 0)
    return headings[0].replace(/# +/, "");
  else
    return null;
}


/**
 * an alternative of lodash/pick
 * @param o {Object} origin of props
 * @param props {Array<String>} names of props be picked
 * @return {Object} a new object consisting of picked props from origin
 */
function pick(o, props) {
  return Object.assign({}, ...props.map(prop => ({[prop]: o[prop]})));
}


function timeTransformer(timestamp) {
  return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

module.exports = themeConfig => {
  const {hostname} = themeConfig;
  // default config of @vuepress/theme-plugin-blog
  // https://vuepress-plugin-blog.ulivz.com/config/
  const defaultBlogPluginOptions = {
    sitemap: {hostname},
    feed: {canonical_base: hostname},
  };

  // move config from themeConfig to @vuepress/theme-plugin-blog
  const themeConfigPluginProperties = [
    "directories",
    "frontmatters",
    "globalPagination",
    "comment",
    "newsletter",
  ];

  // set config of @vuepress/theme-plugin-blog
  const pluginBlogConfig = Object.assign(
    {},
    pick(themeConfig, themeConfigPluginProperties),
    defaultBlogPluginOptions
  );

  const plugins = [
    ["@vuepress/plugin-blog", pluginBlogConfig],
    ['vuepress-plugin-table-of-contents', [1, 4]],
    ['@maginapp/vuepress-plugin-katex', {delimiters: 'dollars'}],
    ['@vuepress/plugin-medium-zoom', {selector: 'img'}],
    ['@vuepress/plugin-search', {searchMaxSuggestions: 10}],
    ['@vuepress/plugin-last-updated', {transformer: timeTransformer}],
    ['vuepress-plugin-clean-urls', {normalSuffix: '/'}],
    ["@vuepress/plugin-pwa", {
      serviceWorker: true,
      updatePopup: {
        '/': {
          message: "博客已更新！",
          buttonText: "刷新"
        }
      },
      popupComponent: 'PwaSnackbar'
    }],
  ];

  // return Option API. see:
  // https://vuepress.vuejs.org/zh/plugin/option-api.html
  return {
    plugins,
    define: {
      THEME_BLOG_PAGINATION_COMPONENT: "SimplePagination"
    },
    alias: {
      '@style': path.resolve(__dirname, 'styles'),
      '@config': path.resolve(__dirname, '../config.js'),
      '@public': path.resolve(__dirname, '../public'),
    },
    // https://vuepress.vuejs.org/zh/plugin/option-api.html#additionalpages
    // additional routes
    additionalPages: [
      {
        path: '/debug/',
        frontmatter: {layout: 'Debug', title: '调试信息'},
      },
      {
        path: '/timeline/',
        frontmatter: {layout: 'Timeline', title: '时间线'}
      },
    ],
    extendPageData($page) {
      const {
        _filePath,           // file's absolute path
        _computed,           // access the client global computed mixins at build time, e.g _computed.$localePath.
        _content,            // file's raw content string
        _strippedContent,    // file's content string without frontmatter
        key,                 // page's unique hash key
        frontmatter,         // page's frontmatter object
        regularPath,         // current page's default link (follow the file hierarchy)
        path,                // current page's real link (use regularPath when permalink does not exist)
      } = $page;

      /*
       * i don't know why building failed if we removed the '_posts' from regularPath
       * so I have to do it in config.js
       */
      // if (regularPath.startsWith('/_posts'))
      //   $page.regularPath = regularPath.substr(7);

      // 匹配 "null"、"Page 1 | null"
      const postListTitleReg = /^(Page \d+ \| )?null$/;

      /*
       * Set /about to Post
       */
      if (path === '/about.html')
        $page.frontmatter.layout = 'Post';

      /*
       * Generate title for posts if it exists in neither $page nor frontmatter
       */
      if ($page.title) {
        // do nothing
      } else if ($page.frontmatter.title) {
        if (postListTitleReg.test($page.frontmatter.title)) {
          $page.frontmatter.title = null;
        } else {
          $page.title = $page.frontmatter.title;
        }
      } else if (_filePath) {
        const guessTitle = getFirstMarkdownHeading(_strippedContent);
        const defaultTitle = getFileNameWithoutExtension(_filePath);
        $page.title = guessTitle ? guessTitle : defaultTitle;
      }

      /*
       * Generate summary for posts if not exists in frontmatter
       */
      if ($page.frontmatter.summary) {
        $page.frontmatter.description = $page.frontmatter.summary;
      } else if (_strippedContent) {
        $page.summary =
          removeMd(
            _strippedContent
              .trim()
              .replace(/^#+\s+(.*)/, "")
              .slice(0, 200)
          ) + " ...";
        $page.frontmatter.description = $page.summary;
      }
    }
  };
};

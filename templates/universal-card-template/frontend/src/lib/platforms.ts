export interface Platform {
    id: string
    label: string
    color: string
    icon: string
    placeholder: string
    href?: string
    hrefEnd?: string
    light?: boolean
    category: 'contact' | 'social'
}

export const PLATFORMS: Platform[] = [
    // ── Contacts ────────────────────────────────────────────
    { id: 'phone',         label: 'Mobile',          category: 'contact', color: '#059669', icon: '/icons/call.svg',           placeholder: '+XX XXXXX XXXXX',                   href: 'tel:' },
    { id: 'office',        label: 'Office',          category: 'contact', color: '#059669', icon: '/icons/call.svg',           placeholder: '+XX XXXXX XXXXX',                   href: 'tel:' },
    { id: 'home',          label: 'Home',            category: 'contact', color: '#059669', icon: '/icons/call.svg',           placeholder: '+XX XXXXX XXXXX',                   href: 'tel:' },
    { id: 'sms',           label: 'SMS',             category: 'contact', color: '#059669', icon: '/icons/sms.svg',            placeholder: '+XX XXXXX XXXXX',                   href: 'sms:' },
    { id: 'email',         label: 'Email',           category: 'contact', color: '#059669', icon: '/icons/email.svg',          placeholder: 'info@example.com',                  href: 'mailto:' },
    { id: 'website',       label: 'Website',         category: 'contact', color: '#059669', icon: '/icons/website.svg',        placeholder: 'https://example.com' },
    { id: 'store',         label: 'Store',           category: 'contact', color: '#059669', icon: '/icons/store.svg',          placeholder: 'https://example.com/store' },
    { id: 'location',      label: 'Location',        category: 'contact', color: '#059669', icon: '/icons/location.svg',       placeholder: 'https://osm.org/go/location' },
    { id: 'whatsapp',      label: 'WhatsApp',        category: 'contact', color: '#059669', icon: '/icons/whatsapp.svg',       placeholder: 'https://wa.me/profileID' },
    { id: 'telegram',      label: 'Telegram',        category: 'contact', color: '#059669', icon: '/icons/telegram.svg',       placeholder: 'username',                          href: 'https://t.me/' },
    { id: 'signal',        label: 'Signal',          category: 'contact', color: '#059669', icon: '/icons/signal.svg',         placeholder: '+XXXXXXXXXXXX',                     href: 'https://signal.me/#p/' },
    { id: 'matrix',        label: 'Matrix',          category: 'contact', color: '#059669', icon: '/icons/matrix.svg',         placeholder: '@username:matrix.org',              href: 'https://matrix.to/#/' },
    { id: 'viber',         label: 'Viber',           category: 'contact', color: '#059669', icon: '/icons/viber.svg',          placeholder: 'XX XXXXX XXXXX' },
    { id: 'messenger',     label: 'Messenger',       category: 'contact', color: '#059669', icon: '/icons/messenger.svg',      placeholder: 'username',                          href: 'https://m.me/' },
    { id: 'skype',         label: 'Skype',           category: 'contact', color: '#059669', icon: '/icons/skype.svg',          placeholder: 'username' },
    { id: 'line',          label: 'Line',            category: 'contact', color: '#059669', icon: '/icons/line.svg',           placeholder: 'LINE ID',                           href: 'https://line.me/ti/p/' },
    { id: 'wechat',        label: 'WeChat',          category: 'contact', color: '#059669', icon: '/icons/wechat.svg',         placeholder: 'WeChat ID' },
    { id: 'xmpp',          label: 'XMPP',            category: 'contact', color: '#059669', icon: '/icons/xmpp.svg',           placeholder: 'XMPP ID',                           href: 'xmpp:' },
    { id: 'calendar',      label: 'Calendar',        category: 'contact', color: '#059669', icon: '/icons/calendar.svg',       placeholder: 'https://example.com/calendarID' },
    // ── Social networks ──────────────────────────────────────
    { id: 'instagram',     label: 'Instagram',       category: 'social',  color: '#ffffff', icon: '/icons/instagram.svg',      placeholder: 'username',                          href: 'https://instagram.com/',          light: true },
    { id: 'threads',       label: 'Threads',         category: 'social',  color: '#000000', icon: '/icons/threads.svg',        placeholder: '@username',                         href: 'https://www.threads.net/' },
    { id: 'pixelfed',      label: 'Pixelfed',        category: 'social',  color: '#8d59a8', icon: '/icons/pixelfed.svg',       placeholder: 'https://pixelfed.social/username' },
    { id: 'facebook',      label: 'Facebook',        category: 'social',  color: '#1877f2', icon: '/icons/facebook.svg',       placeholder: 'username or pagename',              href: 'https://facebook.com/' },
    { id: 'diaspora',      label: 'Diaspora',        category: 'social',  color: '#000000', icon: '/icons/diaspora.svg',       placeholder: 'https://diaspora.social/username' },
    { id: 'friendica',     label: 'Friendica',       category: 'social',  color: '#1d6e9a', icon: '/icons/friendica.svg',      placeholder: 'https://friendica.social/username' },
    { id: 'twitter',       label: 'Twitter',         category: 'social',  color: '#1da1f2', icon: '/icons/twitter.svg',        placeholder: 'username',                          href: 'https://twitter.com/' },
    { id: 'mastodon',      label: 'Mastodon',        category: 'social',  color: '#2b90d9', icon: '/icons/mastodon.svg',       placeholder: 'https://mastodon.social/@username' },
    { id: 'linkedin',      label: 'LinkedIn',        category: 'social',  color: '#0077b5', icon: '/icons/linkedin.svg',       placeholder: 'in/username or company/companyname' },
    { id: 'youtube',       label: 'YouTube',         category: 'social',  color: '#ff0000', icon: '/icons/youtube.svg',        placeholder: 'channel name or ID',                href: 'https://youtube.com/' },
    { id: 'vimeo',         label: 'Vimeo',           category: 'social',  color: '#1ab7ea', icon: '/icons/vimeo.svg',          placeholder: 'channelname',                       href: 'https://vimeo.com/' },
    { id: 'peertube',      label: 'Peertube',        category: 'social',  color: '#f1680d', icon: '/icons/peertube.svg',       placeholder: 'https://peertube.video/channelname' },
    { id: 'pinterest',     label: 'Pinterest',       category: 'social',  color: '#bd081c', icon: '/icons/pinterest.svg',      placeholder: 'username',                          href: 'https://pinterest.com/' },
    { id: 'behance',       label: 'Behance',         category: 'social',  color: '#1769ff', icon: '/icons/behance.svg',        placeholder: 'username',                          href: 'https://behance.net/' },
    { id: 'dribbble',      label: 'Dribbble',        category: 'social',  color: '#ea4c89', icon: '/icons/dribbble.svg',       placeholder: 'username',                          href: 'https://dribbble.com/' },
    { id: 'reddit',        label: 'Reddit',          category: 'social',  color: '#ff5700', icon: '/icons/reddit.svg',         placeholder: 'username',                          href: 'https://reddit.com/user/' },
    { id: 'vk',            label: 'VK',              category: 'social',  color: '#4a76a8', icon: '/icons/vk.svg',             placeholder: 'pagename',                          href: 'https://vk.com/' },
    { id: 'snapchat',      label: 'Snapchat',        category: 'social',  color: '#fffc00', icon: '/icons/snapchat.svg',       placeholder: 'username',                          href: 'https://www.snapchat.com/add/',   light: true },
    { id: 'tiktok',        label: 'TikTok',          category: 'social',  color: '#010101', icon: '/icons/tiktok.svg',         placeholder: 'username',                          href: 'https://tiktok.com/@' },
    { id: 'tumblr',        label: 'Tumblr',          category: 'social',  color: '#2c4762', icon: '/icons/tumblr.svg',         placeholder: 'username',                          href: 'https://',                        hrefEnd: '.tumblr.com/' },
    { id: 'quora',         label: 'Quora',           category: 'social',  color: '#a82400', icon: '/icons/quora.svg',          placeholder: 'username',                          href: 'https://quora.com/' },
    { id: 'medium',        label: 'Medium',          category: 'social',  color: '#000000', icon: '/icons/medium.svg',         placeholder: 'https://medium.com/publication_name' },
    { id: 'discord',       label: 'Discord',         category: 'social',  color: '#7289da', icon: '/icons/discord.svg',        placeholder: 'https://discord.gg/invitecode' },
    { id: 'twitch',        label: 'Twitch',          category: 'social',  color: '#9146ff', icon: '/icons/twitch.svg',         placeholder: 'username',                          href: 'https://twitch.tv/' },
    { id: 'spotify',       label: 'Spotify',         category: 'social',  color: '#1ed760', icon: '/icons/spotify.svg',        placeholder: 'username',                          href: 'https://open.spotify.com/user/' },
    { id: 'soundcloud',    label: 'Soundcloud',      category: 'social',  color: '#ff3300', icon: '/icons/soundcloud.svg',     placeholder: 'username',                          href: 'https://soundcloud.com/' },
    { id: 'funkwhale',     label: 'Funkwhale',       category: 'social',  color: '#009fe3', icon: '/icons/funkwhale.svg',      placeholder: 'https://funkwhale.audio/username' },
    { id: 'github',        label: 'GitHub',          category: 'social',  color: '#333333', icon: '/icons/github.svg',         placeholder: 'username',                          href: 'https://github.com/' },
    { id: 'gitlab',        label: 'GitLab',          category: 'social',  color: '#171321', icon: '/icons/gitlab.svg',         placeholder: 'username',                          href: 'https://gitlab.com/' },
    { id: 'codeberg',      label: 'Codeberg',        category: 'social',  color: '#2185d0', icon: '/icons/codeberg.svg',       placeholder: 'username',                          href: 'https://codeberg.org/' },
    { id: 'artstation',    label: 'ArtStation',      category: 'social',  color: '#171717', icon: '/icons/artstation.svg',     placeholder: 'username',                          href: 'https://www.artstation.com/' },
    { id: 'patreon',       label: 'Patreon',         category: 'social',  color: '#FF424D', icon: '/icons/patreon.svg',        placeholder: 'username',                          href: 'https://patreon.com/' },
    { id: 'paypal',        label: 'PayPal',          category: 'social',  color: '#003087', icon: '/icons/paypal.svg',         placeholder: 'username',                          href: 'https://paypal.me/' },
    { id: 'opencollective',label: 'Open Collective', category: 'social',  color: '#297adc', icon: '/icons/open-collective.svg',placeholder: 'projectname',                      href: 'https://opencollective.com/' },
    { id: 'buymeacoffee',  label: 'Buy me a coffee', category: 'social',  color: '#ffdd00', icon: '/icons/buymeacoffee.svg',   placeholder: 'username',                          href: 'https://www.buymeacoffee.com/',   light: true },
    { id: 'cashapp',       label: 'Cash App',        category: 'social',  color: '#00d632', icon: '/icons/cashapp.svg',        placeholder: '$username',                         href: 'https://cash.app/$' },
    { id: 'siilo',         label: 'Siilo',           category: 'social',  color: '#17233b', icon: '/icons/siilo.svg',          placeholder: 'userID',                            href: 'https://app.siilo.com/qr/' },
    { id: 'appstore',      label: 'App Store',       category: 'social',  color: '#147efb', icon: '/icons/appstore.svg',       placeholder: 'https://apps.apple.com/in/app/…' },
    { id: 'playstore',     label: 'Play Store',      category: 'social',  color: '#01875f', icon: '/icons/playstore.svg',      placeholder: 'https://play.google.com/store/…' },
    { id: 'yelp',          label: 'Yelp',            category: 'social',  color: '#d32323', icon: '/icons/yelp.svg',           placeholder: 'bizname',                           href: 'https://yelp.com/' },
]

export const getPlatform = (id: string): Platform =>
    PLATFORMS.find((p) => p.id === id) ?? { id, label: id, color: '#555', icon: '', placeholder: '', category: 'social' }

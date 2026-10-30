// Routes are deliberately fixed: an arbitrary query string cannot choose an
// unknown component or inject content into the guide.
export const HELP_TOPICS = ['start', 'orders', 'delivery', 'payment', 'returns', 'privacy', 'about', 'contact', 'careers']
export const validHelpTopic = (value) => HELP_TOPICS.includes(value) ? value : 'start'

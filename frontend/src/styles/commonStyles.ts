
export const commonStyles = {
  // Layout
  pageContainer: 'p-4 md:p-6 pt-6 md:pt-8 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto',
  pageContainerFullHeight: 'p-4 md:p-6 pt-6 md:pt-8 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto h-full flex flex-col',

  // Modals
  modalOverlay: 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in',
  modalContainer: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-sm transform animate-scale-in',
  modalContainerLarge: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-md transform animate-scale-in',
  confirmModalContainer: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-11/12 max-w-sm text-center transform animate-scale-in',

  // Buttons
  buttonBase: 'font-bold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed',
  primaryButton: 'w-full bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 disabled:bg-purple-300 dark:disabled:bg-purple-800',
  secondaryButton: 'w-full bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500 focus:ring-gray-400',
  indigoButton: 'w-full bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 dark:disabled:text-gray-400',
  dangerButton: 'w-full bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  dangerButtonOutline: 'w-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-600/20 dark:text-red-300 dark:hover:bg-red-600/40 focus:ring-red-500',
  iconButton: 'p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors',

  // Inputs & Textareas
  textInput: 'w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:outline-none',
  textInputP3: 'w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-3 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors',
  textInputDarkerP3: 'w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-3 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors',
  textarea: 'w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-3 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors resize-none',

  // Cards & Containers
  card: 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md',
  cardHover: 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',

  // Text
  mainTitle: 'text-2xl font-bold text-purple-600 dark:text-purple-300',
  subTitle: 'text-xl font-semibold text-gray-800 dark:text-gray-300',
  label: 'block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1',

  // Misc
  divider: 'border-t border-gray-200 dark:border-gray-700',
  spinner: 'animate-spin rounded-full border-t-2 border-b-2 border-purple-600 dark:border-purple-400',
  tag: 'bg-purple-100 text-purple-700 dark:bg-purple-600/50 dark:text-purple-200 text-xs font-medium px-2 py-1 rounded-full',

  // Specific component styles that are reusable
  navTab: 'flex-1 p-3 font-semibold text-sm transition-colors',
  navTabActive: 'text-purple-600 dark:text-purple-300 border-b-2 border-purple-500 dark:border-purple-400',
  navTabInactive: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50',
};
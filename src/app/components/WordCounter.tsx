'use client'

import React, { useState, useCallback } from 'react'

interface Counts {
  words: number // Adjusted for exclusions
  characters: number
  charactersNoSpaces: number
  sentences: number
  paragraphs: number
  readingTime: string // Based on adjusted word count
  speakingTime: string // Based on adjusted word count
  avgWordLength: number // Adjusted for exclusions
  longestWords: string[] // Adjusted for exclusions
  wordFrequency: { word: string; count: number }[] // Adjusted for exclusions
  fleschReadingEase: { score: string; avgSentenceLength: number } // Based on original sentence/word count
}

const WordCounter: React.FC = () => {
  const [text, setText] = useState<string>('')
  const [excludedWordsInput, setExcludedWordsInput] = useState<string>('') // Input for excluded words
  const [counts, setCounts] = useState<Counts>({
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    sentences: 0,
    paragraphs: 0,
    readingTime: '0 min 0 sec',
    speakingTime: '0 min 0 sec',
    avgWordLength: 0,
    longestWords: [],
    wordFrequency: [],
    fleschReadingEase: { score: 'N/A', avgSentenceLength: 0 },
  })

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.round(totalSeconds % 60)
    return `${minutes} min ${seconds} sec`
  }

  const getWordFrequency = (
    wordList: string[]
  ): { word: string; count: number }[] => {
    const frequencyMap: { [key: string]: number } = {}
    wordList.forEach((word) => {
      // Keep cleaning simple for frequency
      const lowerCaseWord = word.toLowerCase().replace(/[^a-z0-9'-]/g, '') // Allow apostrophes/hyphens
      if (lowerCaseWord) {
        frequencyMap[lowerCaseWord] = (frequencyMap[lowerCaseWord] || 0) + 1
      }
    })
    return Object.entries(frequencyMap)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5) // Top 5
      .map(([word, count]) => ({ word, count }))
  }

  const getLongestWords = (wordList: string[]): string[] => {
    if (wordList.length === 0) return []
    let longestLength = 0
    let longest: string[] = []
    const seenLongest = new Set<string>()
    wordList.forEach((word) => {
      const cleanWord = word.replace(/[^a-z0-9\-]/gi, '') // Keep hyphens
      if (cleanWord.length > longestLength) {
        longestLength = cleanWord.length
        longest = [cleanWord]
        seenLongest.clear()
        seenLongest.add(cleanWord.toLowerCase())
      } else if (
        cleanWord.length === longestLength &&
        !seenLongest.has(cleanWord.toLowerCase())
      ) {
        if (longest.length < 5) {
          // Limit displayed longest words
          longest.push(cleanWord)
          seenLongest.add(cleanWord.toLowerCase())
        }
      }
    })
    return longest
  }

  const calculateFleschReadingEase = (
    totalWords: number,
    totalSentences: number
  ): string => {
    if (totalWords === 0 || totalSentences === 0) {
      return 'N/A'
    }
    const avgSentenceLength = totalWords / totalSentences
    // Note: Accurate syllable counting (ASW) is complex without a library.
    // Formula: 206.835 - 1.015 * ASL - 84.6 * ASW
    // We calculate a partial score based only on ASL.
    const partialScore = 206.835 - 1.015 * avgSentenceLength
    const roundedScore = Math.round(partialScore * 10) / 10
    // Return partial score and indicate it's incomplete
    return `${roundedScore} (Needs Syllables)`
  }

  const updateCounts = useCallback(
    (currentText: string, currentExcludedWordsInput: string) => {
      const trimmedText = currentText.trim()
      const originalWordList =
        trimmedText === '' ? [] : trimmedText.split(/\s+/).filter(Boolean)
      const characters = currentText.length
      const charactersNoSpaces = currentText.replace(/\s/g, '').length
      // Use original word list for sentence/paragraph counts and initial readability calculation
      const originalWordCount = originalWordList.length
      const sentences =
        trimmedText === ''
          ? 0
          : trimmedText
              .split(/[.!?]+(?:\s+|$)|\n+/)
              .filter((s) => s.trim().length > 0).length
      const paragraphs =
        trimmedText === ''
          ? 0
          : trimmedText.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
              .length

      // Parse excluded words (comma or space separated, case-insensitive)
      const excludedWordsSet = new Set(
        currentExcludedWordsInput
          .toLowerCase()
          .split(/[,\s]+/)
          .map((w) => w.trim())
          .filter(Boolean)
      )

      // Filter word list based on exclusions for specific counts
      const filteredWordList = originalWordList.filter(
        (word) =>
          !excludedWordsSet.has(word.toLowerCase().replace(/[^a-z0-9\-']/g, '')) // Basic cleaning for comparison
      )
      const words = filteredWordList.length // Use filtered count

      const readingSpeedWPM = 225
      const speakingSpeedWPM = 150
      // Base time estimates on the filtered word count
      const readingTimeSeconds = words > 0 ? (words / readingSpeedWPM) * 60 : 0
      const speakingTimeSeconds =
        words > 0 ? (words / speakingSpeedWPM) * 60 : 0

      // Calculate stats based on filtered list
      const filteredCharsNoSpaces = filteredWordList.join('').length
      const avgWordLength =
        words > 0 ? parseFloat((filteredCharsNoSpaces / words).toFixed(2)) : 0
      const longestWords = getLongestWords(filteredWordList)
      const wordFrequency = getWordFrequency(filteredWordList)

      // Keep readability based on original text structure
      const avgSentenceLength =
        sentences > 0
          ? parseFloat((originalWordCount / sentences).toFixed(2))
          : 0
      const fleschScore = calculateFleschReadingEase(
        originalWordCount,
        sentences
      )

      setCounts({
        words, // Filtered
        characters,
        charactersNoSpaces,
        sentences,
        paragraphs,
        readingTime: formatTime(readingTimeSeconds), // Filtered
        speakingTime: formatTime(speakingTimeSeconds), // Filtered
        avgWordLength, // Filtered
        longestWords, // Filtered
        wordFrequency, // Filtered
        fleschReadingEase: { score: fleschScore, avgSentenceLength }, // Original
      })
    },
    []
  ) // Dependency array is empty as helpers are stable

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value
    setText(newText)
    updateCounts(newText, excludedWordsInput)
  }

  const handleExcludedWordsChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newExcludedWords = event.target.value
    setExcludedWordsInput(newExcludedWords)
    updateCounts(text, newExcludedWords)
  }

  const handleRemoveExtraSpaces = () => {
    const cleanedText = text.replace(/\s+/g, ' ').trim()
    setText(cleanedText)
    updateCounts(cleanedText, excludedWordsInput)
  }

  const handleRemoveDuplicateWords = () => {
    const words = text.split(/(\s+)/) // Split by space, keeping spaces
    const cleanedWords = []
    let lastWordLower = ''

    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i]
      const currentWordLower = currentWord.toLowerCase()
      const isSpace = /^\s+$/.test(currentWord)

      if (isSpace) {
        // Always keep single spaces between non-duplicate words
        if (
          cleanedWords.length > 0 &&
          !/^\s+$/.test(cleanedWords[cleanedWords.length - 1])
        ) {
          cleanedWords.push(' ') // Add a single space if needed
        }
      } else if (currentWordLower !== lastWordLower) {
        cleanedWords.push(currentWord)
        lastWordLower = currentWordLower
      }
    }
    const cleanedText = cleanedWords.join('').trim() // Join without adding extra spaces
    setText(cleanedText)
    updateCounts(cleanedText, excludedWordsInput)
  }

  const handleUppercase = () => {
    const newText = text.toUpperCase()
    setText(newText)
    updateCounts(newText, excludedWordsInput)
  }

  const handleLowercase = () => {
    const newText = text.toLowerCase()
    setText(newText)
    updateCounts(newText, excludedWordsInput)
  }

  const handleTitleCase = () => {
    const newText = text
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    setText(newText)
    updateCounts(newText, excludedWordsInput)
  }

  return (
    <div className="container mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
        Advanced Word Counter
      </h1>

      {/* Main Text Area */}
      <textarea
        className="mb-4 h-64 w-full resize-none rounded-lg border border-gray-300 p-4 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
        placeholder="Paste or type your text here..."
        value={text}
        onChange={handleTextChange}
      />

      {/* Excluded Words Input */}
      <div className="mb-4">
        <label
          htmlFor="excludedWords"
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Words to Exclude (comma or space separated):
        </label>
        <textarea
          id="excludedWords"
          rows={2}
          className="w-full resize-y rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          placeholder="e.g., the, a, is, an"
          value={excludedWordsInput}
          onChange={handleExcludedWordsChange}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Word count, frequency, time estimates, etc., will ignore these words.
        </p>
      </div>

      {/* Action Buttons (Formatting & Cleaning) */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {/* Formatting */}
        <button
          onClick={handleUppercase}
          className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white transition duration-150 ease-in-out hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          UPPERCASE
        </button>
        <button
          onClick={handleLowercase}
          className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white transition duration-150 ease-in-out hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          lowercase
        </button>
        <button
          onClick={handleTitleCase}
          className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white transition duration-150 ease-in-out hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Title Case
        </button>
        {/* Cleaning */}
        <button
          onClick={handleRemoveExtraSpaces}
          className="rounded bg-green-500 px-3 py-1.5 text-sm text-white transition duration-150 ease-in-out hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
        >
          Remove Extra Spaces
        </button>
        <button
          onClick={handleRemoveDuplicateWords}
          className="rounded bg-green-500 px-3 py-1.5 text-sm text-white transition duration-150 ease-in-out hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
        >
          Remove Duplicate Words
        </button>
      </div>

      {/* Basic Counts Grid (Unaffected by Exclusions, except Word Count) */}
      <h2 className="mb-2 text-center text-xl font-semibold text-gray-800 dark:text-gray-200">
        Core Counts
      </h2>
      <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
        (Word count adjusted by exclusions)
      </p>
      <div className="mb-6 grid grid-cols-2 gap-4 text-center md:grid-cols-5">
        <div className="rounded-lg bg-gray-100 p-4 shadow dark:bg-gray-700">
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {counts.words}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Words</p>
        </div>
        {/* Other core counts remain the same */}
        <div className="rounded-lg bg-gray-100 p-4 shadow dark:bg-gray-700">
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {counts.characters}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Characters</p>
        </div>
        <div className="rounded-lg bg-gray-100 p-4 shadow dark:bg-gray-700">
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {counts.charactersNoSpaces}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Chars (No Spaces)
          </p>
        </div>
        <div className="rounded-lg bg-gray-100 p-4 shadow dark:bg-gray-700">
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {counts.sentences}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Sentences</p>
        </div>
        <div className="rounded-lg bg-gray-100 p-4 shadow dark:bg-gray-700">
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {counts.paragraphs}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Paragraphs</p>
        </div>
      </div>

      {/* Advanced Stats Grid (Adjusted by Exclusions) */}
      <h2 className="mb-4 text-center text-xl font-semibold text-gray-800 dark:text-gray-200">
        Analysis & Estimations
      </h2>
      <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
        (Based on text after word exclusions)
      </p>
      <div className="mb-6 grid grid-cols-1 gap-4 text-center md:grid-cols-3">
        {/* Reading/Speaking Time */}
        <div className="rounded-lg bg-gray-100 p-4 shadow dark:bg-gray-700">
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {counts.readingTime}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Est. Reading Time
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">(~225 WPM)</p>
        </div>
        <div className="rounded-lg bg-gray-100 p-4 shadow dark:bg-gray-700">
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {counts.speakingTime}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Est. Speaking Time
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">(~150 WPM)</p>
        </div>
        {/* Avg Word Length */}
        <div className="rounded-lg bg-gray-100 p-4 shadow dark:bg-gray-700">
          <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
            {counts.avgWordLength}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Avg. Word Length
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">(chars)</p>
        </div>
        {/* Longest Word */}
        <div className="rounded-lg bg-gray-100 p-4 shadow md:col-span-1 dark:bg-gray-700">
          <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">
            Longest Word(s)
          </p>
          {counts.longestWords.length > 0 ? (
            <p className="text-md font-semibold break-words text-purple-600 dark:text-purple-400">
              {counts.longestWords.join(', ')}
            </p>
          ) : (
            <p className="text-md font-semibold text-gray-500 dark:text-gray-400">
              -
            </p>
          )}
        </div>
        {/* Word Frequency */}
        <div className="rounded-lg bg-gray-100 p-4 shadow md:col-span-2 dark:bg-gray-700">
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
            Word Frequency (Top 5)
          </p>
          {counts.wordFrequency.length > 0 ? (
            <ul className="list-inside list-disc text-left text-sm text-gray-700 dark:text-gray-300">
              {counts.wordFrequency.map((item) => (
                <li key={item.word}>
                  {item.word}:{' '}
                  <span className="font-semibold">{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-md font-semibold text-gray-500 dark:text-gray-400">
              -
            </p>
          )}
        </div>
      </div>

      {/* Readability Section (Unaffected by Exclusions) */}
      <div className="mb-6 rounded-lg bg-gray-100 p-4 shadow dark:bg-gray-700">
        <h3 className="mb-2 text-center text-lg font-semibold text-gray-800 dark:text-gray-200">
          Readability
        </h3>
        <p className="mb-3 text-center text-xs text-gray-500 dark:text-gray-400">
          (Based on original text structure)
        </p>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-md font-semibold text-orange-600 dark:text-orange-400">
              {counts.fleschReadingEase.avgSentenceLength}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Avg. Sentence Length
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">(words)</p>
          </div>
          <div>
            <p className="text-md font-semibold text-orange-600 dark:text-orange-400">
              {counts.fleschReadingEase.score}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Flesch Reading Ease
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              (Needs Syllable Count)
            </p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          Note: Full readability scores require syllable analysis, which is not
          implemented here.
        </p>
      </div>
    </div>
  )
}

export default WordCounter

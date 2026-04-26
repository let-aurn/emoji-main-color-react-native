/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';
import {useEmojiColor} from 'emoji-main-color-react-native';
import {useEmojiKeyboard} from 'react-native-system-emoji-picker';

// Note: import explicitly to use the types shipped with jest.
import {describe, it, expect, beforeEach} from '@jest/globals';

import {fireEvent, render} from '@testing-library/react-native';

jest.mock('emoji-main-color-react-native', () => ({
  useEmojiColor: jest.fn(),
}));

jest.mock('react-native-system-emoji-picker', () => ({
  SystemEmojiPicker: 'RNSystemEmojiPickerView',
  useEmojiKeyboard: jest.fn(),
}));

describe('App', () => {
  let openEmojiPicker: jest.Mock;

  beforeEach(() => {
    openEmojiPicker = jest.fn();

    (useEmojiKeyboard as jest.Mock).mockReturnValue({
      ref: {current: null},
      open: openEmojiPicker,
      dismiss: jest.fn(),
    });

    (useEmojiColor as jest.Mock).mockReturnValue({
      result: {
        emoji: '🍋',
        mainColor: '#F4D83D',
        mainDarkColor: '#6D8D3F',
        mainLightColor: '#F8E789',
        palette: ['#F4D83D', '#9DBB52', '#6D8D3F'],
        source: 'computed',
      },
      loading: false,
      error: null,
      reload: jest.fn(),
    });
  });

  it('renders correctly', () => {
    render(<App />);
  });

  it('selects a sample emoji', () => {
    const screen = render(<App />);

    fireEvent.press(screen.getByTestId('emoji-option-🦊'));
    expect(screen.getByTestId('selected-emoji').props.children).toBe('🦊');
  });

  it('opens the picker from the dashed emoji box', () => {
    const screen = render(<App />);

    fireEvent.press(screen.getByTestId('emoji-picker-option'));
    expect(openEmojiPicker).toHaveBeenCalledTimes(1);
  });

  it('displays the picked emoji in the preview and picker box', () => {
    const screen = render(<App />);
    const picker = screen.UNSAFE_getByType(
      'RNSystemEmojiPickerView' as unknown as React.ComponentType<unknown>,
    );

    fireEvent(picker, 'onEmojiSelected', '💶');

    expect(screen.getByTestId('selected-emoji').props.children).toBe('💶');
    expect(screen.getAllByText('💶')).toHaveLength(2);
  });
});

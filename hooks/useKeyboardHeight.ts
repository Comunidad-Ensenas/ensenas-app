import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Reports the on-screen keyboard height. Used instead of KeyboardAvoidingView
 * because the Android build runs edge-to-edge, where the window no longer
 * resizes when the keyboard opens.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

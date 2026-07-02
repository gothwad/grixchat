import { useState } from 'react';
import { toDate } from '../../../utils/dateUtils.ts';

export function useMessageSearch(messages: any[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredMessages = messages.filter(msg => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const text = (msg.content || msg.text || '').toLowerCase();
      if (!text.includes(q)) return false;
    }
    if (selectedDate !== '') {
      const msgDate = toDate(msg.created_at || msg.timestamp);
      if (!msgDate) return false;
      
      const year = msgDate.getFullYear();
      const month = String(msgDate.getMonth() + 1).padStart(2, '0');
      const day = String(msgDate.getDate()).padStart(2, '0');
      const msgDateStr = `${year}-${month}-${day}`;
      
      if (msgDateStr !== selectedDate) return false;
    }
    return true;
  });

  return {
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    showSearch,
    setShowSearch,
    filteredMessages
  };
}

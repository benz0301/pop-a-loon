import React, { useState, useEffect } from 'react';
import { List, Settings } from 'lucide-react';
import storage from '@/storage';
import { Message } from '@const';
import Header from '@/components/Header';
import Main from '@/components/Main';

const App: React.FC = () => {
  const [balloonCount, setBalloonCount] = useState(0);

  const fetchBalloonCount = async () => {
    const count = (await storage.get('user')).count;
    setBalloonCount(count || 0);
  };

  chrome.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse) => {
      if (message.action === 'updateCounter') {
        setBalloonCount(message.balloonCount);
      }
    }
  );

  useEffect(() => {
    fetchBalloonCount();
  });

  return (
    <>
      <Header title="Pop-a-loon" />
      <Main>
        <section className="flex flex-col gap-2 items-center">
          <span className="flex justify-center items-center text-4xl font-bold drop-shadow">
            {balloonCount}
          </span>
          <span className="text-[16px]">
            {balloonCount === 1 ? 'Baloon popped' : 'Balloons popped'}
          </span>
        </section>
      </Main>
    </>
  );
};

export default App;

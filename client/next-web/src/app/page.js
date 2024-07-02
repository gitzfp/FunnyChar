import Tabs from './_components/Tabs';
import Header from './_components/Header';
import Footer from './_components/Footer';

import { getCharacters } from '../util/apiSsr';

export default async function Page() {
  const characters = await getCharacters();

  return (
    <>
      <Header />
      <Tabs characters={characters} />
      <Footer />
    </>
  );
}

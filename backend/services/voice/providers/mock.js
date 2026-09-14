const { EXPENSE_CATEGORIES } = require('../../../domain/expenseCategories');

const CATEGORY_TERMS = {
  Food: ['food', 'lunch', 'dinner', 'breakfast', 'canteen', 'restaurant', 'කෑම', 'ආහාර', 'உணவு', 'சாப்பாடு'],
  Transport: ['transport', 'bus', 'train', 'taxi', 'fuel', 'ප්‍රවාහන', 'බස්', 'போக்குவரத்து', 'பேருந்து'],
  Entertainment: ['movie', 'game', 'entertainment', 'චිත්‍රපට', 'விளையாட்டு', 'திரைப்படம்'],
  Bills: ['bill', 'electricity', 'water', 'බිල්', 'විදුලි', 'கட்டணம்', 'மின்சாரம்'],
  Shopping: ['shopping', 'grocery', 'සාප්පු', 'මිලදී', 'கடை', 'வாங்க'],
  Construction: ['construction', 'cement', 'ඉදිකිරීම්', 'සිමෙන්ති', 'கட்டுமானம்', 'சிமெண்டு'],
  Health: ['health', 'doctor', 'medicine', 'සෞඛ්‍ය', 'බෙහෙත්', 'மருத்துவ', 'மருந்து'],
  Education: ['education', 'book', 'course', 'අධ්‍යාපන', 'පොත්', 'கல்வி', 'புத்தகம்']
};

const detectCategory = (transcript) => {
  const normalized = transcript.toLocaleLowerCase();
  const match = Object.entries(CATEGORY_TERMS).find(([, terms]) =>
    terms.some((term) => normalized.includes(term))
  );
  return match?.[0] || 'Others';
};

const createMockProvider = () => ({
  name: 'mock',
  async generateStructured({ user }) {
    const context = JSON.parse(user);
    const number = context.transcript.match(/(?:rs\.?|රු\.?|ரூ\.?)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
    return {
      amount: number ? Number(number[1].replace(/,/g, '')) : null,
      description: context.transcript.slice(0, 250),
      category: EXPENSE_CATEGORIES.includes(detectCategory(context.transcript))
        ? detectCategory(context.transcript)
        : null,
      date: null
    };
  }
});

module.exports = { createMockProvider };

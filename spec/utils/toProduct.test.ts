import toProduct from '@src/utils/toProduct';

describe('toProduct', () => {
  it('should map name, image, price, url, itemId and variationId', () => {
    expect(
      toProduct({
        value: 'Oxford Shirt',
        data: {
          id: 'SHIRT-476-blue',
          variation_id: '26145-BOV80',
          image_url: 'https://example.com/shirt.jpg',
          url: '/shirt',
          price: 89,
        },
      })
    ).toEqual({
      itemName: 'Oxford Shirt',
      imageUrl: 'https://example.com/shirt.jpg',
      price: 89,
      url: '/shirt',
      itemId: 'SHIRT-476-blue',
      variationId: '26145-BOV80',
    });
  });

  it('should return null without a name or an image', () => {
    expect(
      toProduct({ value: '', data: { image_url: 'https://example.com/a.jpg' } })
    ).toBeNull();
    expect(toProduct({ value: 'Shirt', data: {} })).toBeNull();
  });

  it('should trim the name and default price and url', () => {
    expect(
      toProduct({
        value: '  Shirt ',
        data: { image_url: 'https://e.com/a.jpg' },
      })
    ).toEqual({
      itemName: 'Shirt',
      imageUrl: 'https://e.com/a.jpg',
      price: 0,
      url: '',
    });
  });
});

export const PRODUCT_CREATE_MUTATION = `
  mutation createProduct($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        title
      }
      userErrors {
        message
        field
      }
    }
  }
`;
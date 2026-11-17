export const PRODUCT_SET_MUTATION = `
  mutation createProductAsynchronous($productSet: ProductSetInput!, $synchronous: Boolean!) {
    productSet(synchronous: $synchronous, input: $productSet) {
      product {
        id
      }
      productSetOperation {
        id
        status
        userErrors {
          code
          field
          message
        }
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;


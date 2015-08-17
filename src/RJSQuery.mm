

void RLMUpdateQueryWithPredicate(realm::Query *query, NSPredicate *predicate, RLMSchema *schema,
                                 RLMObjectSchema *objectSchema)
{
    // passing a nil predicate is a no-op
    if (!predicate) {
        return;
    }

    RLMPrecondition([predicate isKindOfClass:NSPredicate.class], @"Invalid argument",
                    @"predicate must be an NSPredicate object");

    update_query_with_predicate(predicate, schema, objectSchema, *query);

    // Test the constructed query in core
    std::string validateMessage = query->validate();
    RLMPrecondition(validateMessage.empty(), @"Invalid query", @"%.*s",
                    (int)validateMessage.size(), validateMessage.c_str());
}
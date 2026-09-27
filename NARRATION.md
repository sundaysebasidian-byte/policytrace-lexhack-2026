An app says it never sends your location. What does its network traffic actually show? PolicyTrace brings the promise and the evidence into one review workspace. Everything is processed locally in your browser. These demonstrations use synthetic data from a fictional app called Cedar Notes.

First, the broken promise. The policy says it never sends precise location and does not collect device identifiers. Email collection is disclosed. Before running the check, I review the extracted claims and confirm their meaning. The result is two potential contradictions and one disclosure match. Opening the location finding shows the exact policy quote and the request containing a coordinate pair. Raw values are masked. The reviewer still checks whether these coordinates describe the user and whether the promise applies.

Now the matching disclosure. This policy discloses all three observed data types. We get three matches, with evidence for each. That is a narrow data-type result, not proof of legal compliance or valid consent.

The third case is just as important. The policy denies sending location and collecting device identifiers, but the request body is missing. PolicyTrace reports insufficient evidence for both. It does not turn an incomplete capture into a passing result.

Finally, I export a review. The report keeps source references while omitting raw identifiers, credentials, unknown hostnames, and free-form notes. You can bring your own policy and HAR through the same workflow. PolicyTrace makes privacy review easier to inspect, easier to reproduce, and clear about what remains unknown.
